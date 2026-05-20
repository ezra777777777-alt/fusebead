import { query } from "../config/db";

export interface FavoriteRow {
  id: number;
  user_id: number;
  pattern_id: number;
  created_at: string;
}

export async function findByUser(userId: number): Promise<any[]> {
  return query(
    `SELECT p.* FROM patterns p
     INNER JOIN favorites f ON f.pattern_id = p.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );
}

export async function add(userId: number, patternId: number): Promise<void> {
  await query(
    "INSERT IGNORE INTO favorites (user_id, pattern_id) VALUES (?, ?)",
    [userId, patternId]
  );
}

export async function remove(userId: number, patternId: number): Promise<void> {
  await query(
    "DELETE FROM favorites WHERE user_id = ? AND pattern_id = ?",
    [userId, patternId]
  );
}

export async function isFavorited(userId: number, patternId: number): Promise<boolean> {
  const rows = await query<any[]>(
    "SELECT 1 FROM favorites WHERE user_id = ? AND pattern_id = ?",
    [userId, patternId]
  );
  return rows.length > 0;
}
