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
  is_approved: boolean;
  is_featured: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatternFilters {
  category?: string;
  sort?: "newest" | "popular";
  page?: number;
  limit?: number;
  userId?: number;
  search?: string;
}

export async function findAll(filters: PatternFilters = {}): Promise<{ patterns: any[]; total: number }> {
  const { category, sort = "newest", page = 1, limit = 12, search, userId } = filters;
  const conditions: string[] = ["p.is_public = TRUE", "p.is_deleted = FALSE", "p.is_approved = TRUE"];
  const values: any[] = [];

  if (category) { conditions.push("p.category = ?"); values.push(category); }
  if (search) { conditions.push("(p.title LIKE ? OR p.description LIKE ?)"); values.push(`%${search}%`, `%${search}%`); }
  if (userId) { conditions.push("p.user_id = ?"); values.push(userId); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const orderBy = sort === "popular" ? "ORDER BY p.likes_count DESC" : "ORDER BY p.created_at DESC";
  const offset = (page - 1) * limit;

  const [countRows] = await query<any[]>(`SELECT COUNT(*) as total FROM patterns p ${where}`, values);
  const total = countRows?.total || 0;

  const patterns = await query<any[]>(
    `SELECT p.*, u.username as author_name
     FROM patterns p
     LEFT JOIN users u ON u.id = p.user_id
     ${where} ${orderBy} LIMIT ? OFFSET ?`,
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
  return {
    id: result.insertId,
    user_id: data.userId,
    title: data.title,
    description: data.description || null,
    category: data.category || null,
    brand: data.brand,
    grid_size: data.gridSize,
    grid_data: data.gridData,
    color_counts: data.colorCounts || null,
    is_public: data.isPublic ?? true,
    is_approved: true,
    is_featured: false,
    is_deleted: false,
    likes_count: 0,
    downloads_count: 0,
    thumbnail_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as PatternRow;
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

// ── Admin functions ──

export async function findAllAdmin(opts: {
  status?: "all" | "pending" | "approved" | "deleted";
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<{ patterns: any[]; total: number }> {
  const { status = "all", page = 1, limit = 20, search } = opts;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: any[] = [];

  if (status === "pending") { conditions.push("is_approved = FALSE AND is_deleted = FALSE"); }
  else if (status === "approved") { conditions.push("is_approved = TRUE AND is_deleted = FALSE"); }
  else if (status === "deleted") { conditions.push("is_deleted = TRUE"); }

  if (search) {
    conditions.push("(title LIKE ? OR description LIKE ?)");
    values.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [countRows] = await query<any[]>(`SELECT COUNT(*) as total FROM patterns ${where}`, values);
  const total = countRows?.total || 0;
  const patterns = await query<any[]>(
    `SELECT p.*, u.username as author_name
     FROM patterns p
     LEFT JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  return { patterns, total };
}

export async function updateAdmin(id: number, data: { is_approved?: boolean; is_featured?: boolean; is_deleted?: boolean }): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.is_approved !== undefined) { fields.push("is_approved = ?"); values.push(data.is_approved); }
  if (data.is_featured !== undefined) { fields.push("is_featured = ?"); values.push(data.is_featured); }
  if (data.is_deleted !== undefined) { fields.push("is_deleted = ?"); values.push(data.is_deleted); }
  if (fields.length === 0) return false;
  values.push(id);
  const result = await query<any>(`UPDATE patterns SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.affectedRows > 0;
}

export async function getStats(): Promise<{ totalPatterns: number; pendingPatterns: number; todayPatterns: number }> {
  const [total] = await query<any[]>("SELECT COUNT(*) as c FROM patterns WHERE is_deleted = FALSE");
  const [pending] = await query<any[]>("SELECT COUNT(*) as c FROM patterns WHERE is_approved = FALSE AND is_deleted = FALSE");
  const [today] = await query<any[]>("SELECT COUNT(*) as c FROM patterns WHERE DATE(created_at) = DATE('now')");
  return {
    totalPatterns: total?.c || 0,
    pendingPatterns: pending?.c || 0,
    todayPatterns: today?.c || 0,
  };
}

