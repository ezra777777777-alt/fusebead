import { query } from "../config/db";

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  plan: "free" | "pro" | "team";
  is_admin: boolean;
  is_banned: boolean;
  email_verified: number;
  subscription_expires_at: string | null;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}

export async function findById(id: number): Promise<UserRow | null> {
  const rows = await query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0] || null;
}

export async function create(data: { username: string; email: string; password_hash: string; email_verified?: number }): Promise<UserRow> {
  const result = await query<any>(
    "INSERT INTO users (username, email, password_hash, email_verified) VALUES (?, ?, ?, ?)",
    [data.username, data.email, data.password_hash, data.email_verified ?? 0]
  );
  return { id: result.insertId, ...data, avatar_url: null, plan: "free", email_verified: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as UserRow;
}

export async function verifyEmail(email: string): Promise<boolean> {
  const result = await query<any>(
    "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE email = ?",
    [email],
  );
  return result.affectedRows > 0;
}

export async function update(id: number, data: Partial<Pick<UserRow, "username" | "avatar_url">>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.username) { fields.push("username = ?"); values.push(data.username); }
  if (data.avatar_url !== undefined) { fields.push("avatar_url = ?"); values.push(data.avatar_url); }
  if (fields.length === 0) return;
  values.push(id);
  await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function findAll(opts: { page?: number; limit?: number; search?: string } = {}): Promise<{ users: UserRow[]; total: number }> {
  const { page = 1, limit = 20, search } = opts;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: any[] = [];

  if (search) {
    conditions.push("(username LIKE ? OR email LIKE ?)");
    values.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [countRows] = await query<any[]>(`SELECT COUNT(*) as total FROM users ${where}`, values);
  const total = countRows?.total || 0;
  const users = await query<UserRow[]>(
    `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  return { users, total };
}

export async function updateAdmin(
  id: number,
  data: Partial<Pick<UserRow, "plan" | "is_banned" | "is_admin" | "subscription_expires_at" | "subscription_status">>,
): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.plan !== undefined) { fields.push("plan = ?"); values.push(data.plan); }
  if (data.is_banned !== undefined) { fields.push("is_banned = ?"); values.push(data.is_banned); }
  if (data.is_admin !== undefined) { fields.push("is_admin = ?"); values.push(data.is_admin); }
  if (data.subscription_expires_at !== undefined) { fields.push("subscription_expires_at = ?"); values.push(data.subscription_expires_at); }
  if (data.subscription_status !== undefined) { fields.push("subscription_status = ?"); values.push(data.subscription_status); }
  if (fields.length === 0) return false;
  values.push(id);
  const result = await query<any>(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.affectedRows > 0;
}

export async function getStats(): Promise<{ totalUsers: number; todayUsers: number }> {
  const [total] = await query<any[]>("SELECT COUNT(*) as c FROM users");
  const [today] = await query<any[]>("SELECT COUNT(*) as c FROM users WHERE DATE(created_at) = DATE('now')");
  return { totalUsers: total?.c || 0, todayUsers: today?.c || 0 };
}

export async function upgradePlan(id: number, plan: "pro" | "team", expiresAt: string): Promise<void> {
  await query(
    "UPDATE users SET plan = ?, subscription_expires_at = ?, subscription_status = 'active', updated_at = datetime('now') WHERE id = ?",
    [plan, expiresAt, id],
  );
}

export async function updatePassword(id: number, password_hash: string): Promise<void> {
  await query("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [password_hash, id]);
}

export async function checkSubscriptionExpiry(): Promise<number> {
  const result = await query<any>(
    `UPDATE users SET plan = 'free', subscription_status = 'expired', subscription_expires_at = NULL, updated_at = datetime('now')
     WHERE subscription_status = 'active' AND subscription_expires_at IS NOT NULL AND subscription_expires_at <= datetime('now')
       AND plan != 'free'`,
  );
  return result.affectedRows || 0;
}
