import { Router } from "express";
import crypto from "crypto";
import { generateCaptchaText, renderCaptchaSvg } from "../utils/captcha";
import * as VerificationCode from "../models/verificationCode";
import * as User from "../models/user";
import { signToken } from "../middleware/auth";
import { query, transaction } from "../config/db";
import { asyncRoute, HttpError } from "../utils/http";
import { emailAddress } from "../utils/authValidation";
import { sendEmailCode } from "../utils/verificationEmail";

export const verificationRouter = Router();

verificationRouter.get("/captcha", asyncRoute(async (_req, res) => {
  const text = generateCaptchaText(4);
  const captchaId = crypto.randomUUID();
  await VerificationCode.create({ email: captchaId, code: text, type: "captcha", ttlMinutes: 5 });
  res.json({ captchaId, svgBase64: renderCaptchaSvg(text) });
}));

verificationRouter.post("/send-code", asyncRoute(async (req, res) => {
  const email = emailAddress(req.body.email);
  const { captchaId, captchaText } = req.body;
  if (typeof captchaId !== "string" || typeof captchaText !== "string" || !await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" })) throw new HttpError(400, "图形验证码错误或已过期，请刷新后重试");
  const user = await User.findByEmail(email);
  if (user && !user.email_verified && !user.is_banned) await sendEmailCode(user.email, "email_verify");
  res.json({ success: true });
}));

verificationRouter.post("/verify-code", asyncRoute(async (req, res) => {
  const email = emailAddress(req.body.email);
  const { code } = req.body;
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) throw new HttpError(400, "请输入 6 位数字验证码");
  const user = await transaction(async () => {
    const [row] = await query<User.UserRow[]>("SELECT * FROM users WHERE LOWER(email) = ? FOR UPDATE", [email]);
    if (!row || row.email_verified || row.is_banned) return null;
    if (!await VerificationCode.verify({ email: row.email, code, type: "email_verify" })) return null;
    await User.verifyEmail(row.email);
    await query("DELETE FROM verification_codes WHERE email = ? AND type = 'email_verify'", [row.email]);
    return row;
  });
  if (!user) throw new HttpError(400, "验证码错误、已过期或尝试次数过多；已验证的账号请直接登录");
  const token = signToken({ userId: user.id, plan: user.plan, tokenVersion: user.token_version });
  res.json({ token, user: {
    id: user.id, username: user.username, email: user.email,
    avatar_url: user.avatar_url, plan: user.plan, is_admin: !!user.is_admin,
    contribution_points: Number(user.contribution_points || 0),
    subscription_expires_at: user.subscription_expires_at, subscription_status: user.subscription_status,
  } });
}));
