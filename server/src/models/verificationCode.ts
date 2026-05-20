import { query } from "../config/db";

export interface VerificationCodeRow {
  id: number;
  email: string;
  code: string;
  type: "captcha" | "email_verify" | "password_reset";
  expires_at: string;
  created_at: string;
}

export async function create(params: {
  email: string;
  code: string;
  type: "captcha" | "email_verify" | "password_reset";
  ttlMinutes?: number;
}): Promise<VerificationCodeRow> {
  const ttl = params.ttlMinutes ?? (params.type === "captcha" ? 5 : 10);
  const result = await query<any>(
    "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, datetime('now', ? || ' minutes'))",
    [params.email, params.code, params.type, String(ttl)],
  );
  return {
    id: result.insertId,
    email: params.email,
    code: params.code,
    type: params.type,
    expires_at: "",
    created_at: new Date().toISOString(),
  };
}

export async function verify(params: {
  email: string;
  code: string;
  type: "captcha" | "email_verify" | "password_reset";
}): Promise<boolean> {
  const rows = await query<VerificationCodeRow[]>(
    "SELECT id FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND expires_at > datetime('now') LIMIT 1",
    [params.email, params.code, params.type],
  );
  if (rows.length === 0) return false;
  await query("DELETE FROM verification_codes WHERE id = ?", [rows[0].id]);
  return true;
}

export async function cleanupExpired(): Promise<void> {
  await query("DELETE FROM verification_codes WHERE expires_at <= datetime('now')");
}

export async function hasRecentCode(email: string, type: string, withinSeconds = 60): Promise<boolean> {
  const rows = await query<any[]>(
    "SELECT COUNT(*) as c FROM verification_codes WHERE email = ? AND type = ? AND created_at > datetime('now', ? || ' seconds')",
    [email, type, String(-withinSeconds)],
  );
  return (rows[0]?.c || 0) > 0;
}
