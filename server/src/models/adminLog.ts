import { query } from "../config/db";

export interface AdminLogRow {
  id: number;
  admin_id: number;
  action: string;
  target_type: string | null;
  target_id: number | null;
  detail: string | null;
  created_at: string;
  admin_name?: string;
}

export async function create(
  adminId: number,
  action: string,
  targetType?: string,
  targetId?: number,
  detail?: string,
): Promise<void> {
  await query(
    "INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)",
    [adminId, action, targetType || null, targetId || null, detail || null],
  );
}

export async function findAll(page = 1, limit = 20): Promise<{ logs: AdminLogRow[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await query<any[]>("SELECT COUNT(*) as total FROM admin_logs");
  const total = countRows?.total || 0;
  const logs = await query<AdminLogRow[]>(
    `SELECT al.*, u.username as admin_name
     FROM admin_logs al
     LEFT JOIN users u ON u.id = al.admin_id
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return { logs, total };
}
