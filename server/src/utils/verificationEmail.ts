import { randomInt } from "crypto";
import { query, transaction } from "../config/db";
import * as VerificationCode from "../models/verificationCode";
import { sendVerificationCode } from "./mailer";
import { HttpError } from "./http";

export async function sendEmailCode(email: string, type: "email_verify" | "password_reset"): Promise<void> {
  const record = await transaction(async () => {
    await query("SELECT id FROM users WHERE email = ? FOR UPDATE", [email]);
    if (await VerificationCode.hasRecentCode(email, type, 60)) throw new HttpError(429, "请等待 60 秒后再发送验证码");
    const [previous] = await query<VerificationCode.VerificationCodeRow[]>("SELECT code FROM verification_codes WHERE email = ? AND type = ? ORDER BY id DESC LIMIT 1", [email, type]);
    let code: string;
    do { code = String(randomInt(100000, 1000000)); } while (code === previous?.code);
    return VerificationCode.create({ email, code, type, ttlMinutes: 10 });
  });
  try { await sendVerificationCode(email, record.code, type); }
  catch {
    await query("DELETE FROM verification_codes WHERE id = ?", [record.id]);
    throw new HttpError(503, "邮件暂时无法发送，请稍后重试");
  }
}
