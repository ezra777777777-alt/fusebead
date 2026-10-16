import { Router } from "express";
import bcrypt from "bcryptjs";
import * as User from "../models/user";
import * as VerificationCode from "../models/verificationCode";
import { signToken } from "../middleware/auth";
import { query, transaction } from "../config/db";
import { asyncRoute, HttpError } from "../utils/http";
import { emailAddress, validateNewPassword } from "../utils/authValidation";
import { sendEmailCode } from "../utils/verificationEmail";

export const authRouter = Router();

authRouter.post("/register", asyncRoute(async (req, res) => {
  const { username, password, captchaId, captchaText } = req.body;
  const email = emailAddress(req.body.email);
  validateNewPassword(password);
  if (typeof username !== "string" || username.trim().length < 2 || username.length > 40) throw new HttpError(400, "昵称需 2–40 字");
  if (req.body.acceptedTerms !== true) throw new HttpError(400, "请先阅读并同意用户协议和隐私政策");
  if (typeof captchaId !== "string" || typeof captchaText !== "string" || !await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" })) throw new HttpError(400, "图形验证码错误或已过期，请刷新后重试");
  const password_hash = await bcrypt.hash(password, 10);
  const user = await transaction(async () => {
    if (await User.findByEmail(email)) throw new HttpError(409, "邮箱已注册，请登录或找回密码");
    try { return await User.create({ username: username.trim(), email, password_hash, email_verified: 0 }); }
    catch (e: any) {
      if (e.code === "23505" || String(e.message).includes("UNIQUE constraint")) throw new HttpError(409, "邮箱已注册，请登录或找回密码");
      throw e;
    }
  });
  let emailSent = true;
  try { await sendEmailCode(user.email, "email_verify"); }
  catch { emailSent = false; }
  res.status(201).json({ success: true, email: user.email, emailSent });
}));

authRouter.post("/login", asyncRoute(async (req, res) => {
  const email = emailAddress(req.body.email);
  const { password, captchaId, captchaText } = req.body;
  if (typeof password !== "string" || !password || password.length > 128) throw new HttpError(400, "请填写邮箱和密码");
  if (typeof captchaId !== "string" || typeof captchaText !== "string" || !await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" })) throw new HttpError(400, "图形验证码错误或已过期，请刷新后重试");
  const user = await User.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.password_hash)) throw new HttpError(401, "邮箱或密码错误");
  if (user.is_banned) { res.status(403).json({ error: "账号已被封禁", code: "ACCOUNT_BANNED" }); return; }
  if (!user.email_verified) { res.status(403).json({ error: "请先验证邮箱", code: "EMAIL_UNVERIFIED", email: user.email, needVerify: true }); return; }
  const token = signToken({ userId: user.id, plan: user.plan, tokenVersion: user.token_version });
  res.json({ token, user: {
    id: user.id, username: user.username, email: user.email,
    plan: user.plan, avatar_url: user.avatar_url, is_admin: !!user.is_admin,
    contribution_points: Number(user.contribution_points || 0),
    subscription_expires_at: user.subscription_expires_at, subscription_status: user.subscription_status,
  } });
}));

authRouter.post("/forgot-password", asyncRoute(async (req, res) => {
  const user = await User.findByEmail(emailAddress(req.body.email));
  if (user) {
    // Keep the same response for unknown accounts, cooldowns and delivery failures.
    try { await sendEmailCode(user.email, "password_reset"); }
    catch (e) { if (!(e instanceof HttpError)) throw e; }
  }
  res.json({ success: true });
}));

authRouter.post("/reset-password", asyncRoute(async (req, res) => {
  const email = emailAddress(req.body.email);
  const { code, password } = req.body;
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) throw new HttpError(400, "请输入 6 位数字验证码");
  validateNewPassword(password);
  const password_hash = await bcrypt.hash(password, 10);
  const changed = await transaction(async () => {
    const [user] = await query<User.UserRow[]>("SELECT * FROM users WHERE LOWER(email) = ? FOR UPDATE", [email]);
    if (!user || !await VerificationCode.verify({ email: user.email, code, type: "password_reset" })) return false;
    await User.updatePassword(user.id, password_hash);
    await query("DELETE FROM verification_codes WHERE email = ?", [user.email]);
    return true;
  });
  if (!changed) throw new HttpError(400, "验证码错误、已过期或尝试次数过多，请重新发送");
  res.json({ success: true });
}));
