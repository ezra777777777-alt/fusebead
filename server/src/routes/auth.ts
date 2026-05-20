import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as User from "../models/user";
import * as VerificationCode from "../models/verificationCode";
import { sendVerificationCode } from "../utils/mailer";
import { signToken } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, captchaId, captchaText } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Validate CAPTCHA
    if (!captchaId || !captchaText) {
      res.status(400).json({ error: "CAPTCHA required" });
      return;
    }
    const captchaValid = await VerificationCode.verify({
      email: captchaId,
      code: String(captchaText).toUpperCase(),
      type: "captcha",
    });
    if (!captchaValid) {
      res.status(400).json({ error: "Invalid or expired CAPTCHA" });
      return;
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password_hash, email_verified: 0 });

    // Send verification email
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await VerificationCode.create({ email, code, type: "email_verify", ttlMinutes: 10 });
    try {
      await sendVerificationCode(email, code);
    } catch (mailErr) {
      console.error("[auth] send email error:", mailErr);
      // Don't fail — user is created, they can resend verification later
    }

    res.status(201).json({ success: true, email: user.email });
  } catch (err) {
    console.error("[auth] register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password, captchaId, captchaText } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Missing email or password" });
      return;
    }

    // Validate CAPTCHA
    if (!captchaId || !captchaText) {
      res.status(400).json({ error: "CAPTCHA required" });
      return;
    }
    const captchaValid = await VerificationCode.verify({
      email: captchaId,
      code: String(captchaText).toUpperCase(),
      type: "captcha",
    });
    if (!captchaValid) {
      res.status(400).json({ error: "Invalid or expired CAPTCHA" });
      return;
    }

    const user = await User.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Check email verified
    if (!user.email_verified) {
      res.status(403).json({ error: "Email not verified", email: user.email, needVerify: true });
      return;
    }

    const token = signToken({ userId: user.id, plan: user.plan });

    res.json({
      token,
      user: {
        id: user.id, username: user.username, email: user.email,
        plan: user.plan, avatar_url: user.avatar_url, is_admin: !!user.is_admin,
      },
    });
  } catch (err) {
    console.error("[auth] login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Forgot password — send reset code
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email required" });
      return;
    }

    const user = await User.findByEmail(email);
    // Don't reveal whether user exists — always return success
    if (!user) {
      res.json({ success: true });
      return;
    }

    // Rate limit: max 1 reset request per 60s
    const recent = await VerificationCode.hasRecentCode(email, "password_reset", 60);
    if (recent) {
      res.json({ success: true });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await VerificationCode.create({ email, code, type: "password_reset", ttlMinutes: 10 });

    try {
      await sendVerificationCode(email, code, "password_reset");
    } catch (mailErr) {
      console.error("[auth] send reset email error:", mailErr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[auth] forgot-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset password using code
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const valid = await VerificationCode.verify({ email, code, type: "password_reset" });
    if (!valid) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    const user = await User.findByEmail(email);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    await User.updatePassword(user.id, password_hash);

    res.json({ success: true });
  } catch (err) {
    console.error("[auth] reset-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
