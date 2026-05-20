import { Router, Request, Response } from "express";
import crypto from "crypto";
import { generateCaptchaText, renderCaptchaSvg } from "../utils/captcha";
import { sendVerificationCode } from "../utils/mailer";
import * as VerificationCode from "../models/verificationCode";
import * as User from "../models/user";
import { signToken } from "../middleware/auth";

export const verificationRouter = Router();

// Generate CAPTCHA
verificationRouter.get("/captcha", async (_req: Request, res: Response) => {
  try {
    const text = generateCaptchaText(4);
    const captchaId = crypto.randomUUID();
    const svgBase64 = renderCaptchaSvg(text);

    await VerificationCode.create({ email: captchaId, code: text, type: "captcha", ttlMinutes: 5 });

    res.json({ captchaId, svgBase64 });
  } catch (err) {
    console.error("[verification] captcha error:", err);
    res.status(500).json({ error: "Failed to generate CAPTCHA" });
  }
});

// Send verification code to email (requires CAPTCHA)
verificationRouter.post("/send-code", async (req: Request, res: Response) => {
  try {
    const { email, captchaId, captchaText } = req.body;

    if (!email || !captchaId || !captchaText) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Validate CAPTCHA
    const captchaValid = await VerificationCode.verify({ email: captchaId, code: captchaText?.toUpperCase?.() || captchaText, type: "captcha" });
    if (!captchaValid) {
      res.status(400).json({ error: "Invalid or expired CAPTCHA" });
      return;
    }

    // Rate limit: max 1 code per 60s per email
    const recent = await VerificationCode.hasRecentCode(email, "email_verify", 60);
    if (recent) {
      res.status(429).json({ error: "Please wait before requesting another code" });
      return;
    }

    // Generate and store code
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    await VerificationCode.create({ email, code, type: "email_verify", ttlMinutes: 10 });

    // Send email
    try {
      await sendVerificationCode(email, code);
    } catch (mailErr) {
      console.error("[verification] send email error:", mailErr);
      res.status(500).json({ error: "Failed to send verification email. Please check SMTP configuration." });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[verification] send-code error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify email code and activate account
verificationRouter.post("/verify-code", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const valid = await VerificationCode.verify({ email, code, type: "email_verify" });
    if (!valid) {
      res.status(400).json({ error: "Invalid or expired verification code" });
      return;
    }

    // Activate user
    await User.verifyEmail(email);

    // Log user in
    const user = await User.findByEmail(email);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const token = signToken({ userId: user.id, plan: user.plan });

    res.json({
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        avatar_url: user.avatar_url, plan: user.plan, is_admin: !!user.is_admin,
      },
    });
  } catch (err) {
    console.error("[verification] verify-code error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
