import { query } from "../config/db";

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  plan: "free" | "pro" | "team";
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

export async function create(data: { username: string; email: string; password_hash: string }): Promise<UserRow> {
  const result = await query<any>(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    [data.username, data.email, data.password_hash]
  );
  return { id: result.insertId, ...data, avatar_url: null, plan: "free", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as UserRow;
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
