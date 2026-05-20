import { query } from "../config/db";

export interface FeedbackRow {
  id: number;
  user_id: number;
  subject: string;
  message: string;
  is_read: number;
  created_at: string;
}

export async function create(data: {
  user_id: number;
  subject: string;
  message: string;
}): Promise<FeedbackRow> {
  const result = await query<any>(
    "INSERT INTO feedbacks (user_id, subject, message) VALUES (?, ?, ?)",
    [data.user_id, data.subject, data.message],
  );
  return {
    id: result.insertId,
    user_id: data.user_id,
    subject: data.subject,
    message: data.message,
    is_read: 0,
    created_at: new Date().toISOString(),
  };
}

export async function findAll(page = 1, limit = 20): Promise<{
  feedbacks: (FeedbackRow & { username: string; email: string })[];
  total: number;
}> {
  const offset = (page - 1) * limit;
  const [countRows] = await query<any[]>("SELECT COUNT(*) as total FROM feedbacks");
  const total = countRows?.total || 0;
  const feedbacks = await query<any[]>(
    `SELECT f.*, u.username, u.email
     FROM feedbacks f
     LEFT JOIN users u ON u.id = f.user_id
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return { feedbacks, total };
}

export async function markRead(id: number): Promise<void> {
  await query("UPDATE feedbacks SET is_read = 1 WHERE id = ?", [id]);
}

export async function markAllRead(): Promise<void> {
  await query("UPDATE feedbacks SET is_read = 1 WHERE is_read = 0");
}

export async function getUnreadCount(): Promise<number> {
  const [row] = await query<any[]>("SELECT COUNT(*) as c FROM feedbacks WHERE is_read = 0");
  return row?.c || 0;
}
