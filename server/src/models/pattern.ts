import { query } from "../config/db";

export interface PatternRow {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: string | null;
  brand: string;
  grid_size: number;
  grid_data: string;
  color_counts: string | null;
  thumbnail_url: string | null;
  likes_count: number;
  downloads_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatternFilters {
  category?: string;
  sort?: "newest" | "popular";
  page?: number;
  limit?: number;
  userId?: number;
}

export async function findAll(filters: PatternFilters = {}): Promise<{ patterns: PatternRow[]; total: number }> {
  const { category, sort = "newest", page = 1, limit = 12 } = filters;
  const conditions: string[] = ["is_public = TRUE"];
  const values: any[] = [];

  if (category) { conditions.push("category = ?"); values.push(category); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = sort === "popular" ? "ORDER BY likes_count DESC" : "ORDER BY created_at DESC";
  const offset = (page - 1) * limit;

  const [countRows] = await query<any[]>(`SELECT COUNT(*) as total FROM patterns ${where}`, values);
  const total = countRows[0]?.total || 0;

  const patterns = await query<PatternRow[]>(
    `SELECT * FROM patterns ${where} ${orderBy} LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return { patterns, total };
}

export async function findById(id: number): Promise<PatternRow | null> {
  const rows = await query<PatternRow[]>("SELECT * FROM patterns WHERE id = ?", [id]);
  return rows[0] || null;
}

export async function findByUserId(userId: number): Promise<PatternRow[]> {
  return query<PatternRow[]>("SELECT * FROM patterns WHERE user_id = ? ORDER BY created_at DESC", [userId]);
}

export async function create(data: {
  userId: number; title: string; description?: string; category?: string;
  brand: string; gridSize: number; gridData: string; colorCounts?: string;
  isPublic?: boolean;
}): Promise<PatternRow> {
  const result = await query<any>(
    `INSERT INTO patterns (user_id, title, description, category, brand, grid_size, grid_data, color_counts, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.userId, data.title, data.description || null, data.category || null, data.brand, data.gridSize,
     data.gridData, data.colorCounts || null, data.isPublic ?? true]
  );
  return { id: result.insertId, ...data, likes_count: 0, downloads_count: 0, thumbnail_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PatternRow;
}

export async function remove(id: number, userId: number): Promise<boolean> {
  const result = await query<any>("DELETE FROM patterns WHERE id = ? AND user_id = ?", [id, userId]);
  return result.affectedRows > 0;
}

export async function incrementLikes(id: number): Promise<void> {
  await query("UPDATE patterns SET likes_count = likes_count + 1 WHERE id = ?", [id]);
}

export async function incrementDownloads(id: number): Promise<void> {
  await query("UPDATE patterns SET downloads_count = downloads_count + 1 WHERE id = ?", [id]);
}
