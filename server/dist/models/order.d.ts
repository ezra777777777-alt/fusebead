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
export declare function create(data: {
    user_id: number;
    order_no: string;
    provider: "alipay" | "wechat";
    plan: "pro" | "team";
    amount: number;
    out_trade_no?: string;
    qr_code?: string;
    subscription_expires_at?: string;
}): Promise<OrderRow>;
export declare function findByOrderNo(order_no: string): Promise<OrderRow | null>;
export declare function findByUser(user_id: number): Promise<OrderRow[]>;
export declare function updateStatus(order_no: string, status: OrderRow["status"], extra?: {
    out_trade_no?: string;
    paid_at?: string;
}): Promise<boolean>;
export declare function findPendingExpired(withinMinutes?: number): Promise<OrderRow[]>;
