import { query, transaction } from "../config/db";

export interface VerificationCodeRow {
  id: number;
  email: string;
  code: string;
  type: "captcha" | "email_verify" | "password_reset";
  expires_at: string;
  created_at: string;
  attempts: number;
}

export async function create(params: {
  email: string;
  code: string;
  type: "captcha" | "email_verify" | "password_reset";
  ttlMinutes?: number;
}): Promise<VerificationCodeRow> {
  const ttl = params.ttlMinutes ?? (params.type === "captcha" ? 5 : 10);
  return transaction(async () => {
    await query("DELETE FROM verification_codes WHERE email = ? AND type = ?", [params.email, params.type]);
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
      attempts: 0,
    };
  });
}

export async function verify(params: {
  email: string;
  code: string;
  type: "captcha" | "email_verify" | "password_reset";
}): Promise<boolean> {
  if (typeof params.email !== "string" || typeof params.code !== "string") return false;
  return transaction(async () => {
    const [row] = await query<VerificationCodeRow[]>(
      "SELECT * FROM verification_codes WHERE email = ? AND type = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [params.email, params.type],
    );
    if (!row || row.attempts >= 5) return false;
    if (row.code !== params.code) {
      await query("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?", [row.id]);
      return false;
    }
    const result = await query("DELETE FROM verification_codes WHERE id = ?", [row.id]);
    return result.affectedRows === 1;
  });
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
