import { query } from "../config/db";

export interface OrderRow {
  id: number;
  user_id: number;
  order_no: string;
  provider: "alipay" | "wechat";
  plan: "pro" | "team";
  amount: number;
  out_trade_no: string | null;
  qr_code: string | null;
  status: "pending" | "paid" | "cancelled" | "expired" | "refunded";
  paid_at: string | null;
  subscription_expires_at: string | null;
  auto_renew: number;
  created_at: string;
  updated_at: string;
}

export async function create(data: {
  user_id: number;
  order_no: string;
  provider: "alipay" | "wechat";
  plan: "pro" | "team";
  amount: number;
  out_trade_no?: string;
  qr_code?: string;
  subscription_expires_at?: string;
}): Promise<OrderRow> {
  const result = await query<any>(
    `INSERT INTO orders (user_id, order_no, provider, plan, amount, out_trade_no, qr_code, subscription_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.user_id, data.order_no, data.provider, data.plan, data.amount,
      data.out_trade_no || null, data.qr_code || null, data.subscription_expires_at || null,
    ],
  );
  return {
    id: result.insertId,
    user_id: data.user_id,
    order_no: data.order_no,
    provider: data.provider,
    plan: data.plan,
    amount: data.amount,
    out_trade_no: data.out_trade_no || null,
    qr_code: data.qr_code || null,
    status: "pending",
    paid_at: null,
    subscription_expires_at: data.subscription_expires_at || null,
    auto_renew: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function findByOrderNo(order_no: string): Promise<OrderRow | null> {
  const rows = await query<OrderRow[]>("SELECT * FROM orders WHERE order_no = ?", [order_no]);
  return rows[0] || null;
}

export async function findByUser(user_id: number): Promise<OrderRow[]> {
  return query<OrderRow[]>(
    "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    [user_id],
  );
}

export async function updateStatus(
  order_no: string,
  status: OrderRow["status"],
  extra?: { out_trade_no?: string; paid_at?: string },
): Promise<boolean> {
  const fields = ["status = ?", "updated_at = datetime('now')"];
  const values: any[] = [status];
  if (extra?.out_trade_no) { fields.push("out_trade_no = ?"); values.push(extra.out_trade_no); }
  if (extra?.paid_at) { fields.push("paid_at = ?"); values.push(extra.paid_at); }
  values.push(order_no);
  const result = await query<any>(
    `UPDATE orders SET ${fields.join(", ")} WHERE order_no = ?`,
    values,
  );
  return result.affectedRows > 0;
}

export async function findPendingExpired(withinMinutes = 30): Promise<OrderRow[]> {
  return query<OrderRow[]>(
    `SELECT * FROM orders WHERE status = 'pending'
     AND created_at < datetime('now', ? || ' minutes')`,
    [String(-withinMinutes)],
  );
}
