"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.findByOrderNo = findByOrderNo;
exports.findByUser = findByUser;
exports.updateStatus = updateStatus;
exports.findPendingExpired = findPendingExpired;
const db_1 = require("../config/db");
async function create(data) {
    const result = await (0, db_1.query)(`INSERT INTO orders (user_id, order_no, provider, plan, amount, out_trade_no, qr_code, subscription_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.user_id, data.order_no, data.provider, data.plan, data.amount,
        data.out_trade_no || null, data.qr_code || null, data.subscription_expires_at || null,
    ]);
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
async function findByOrderNo(order_no) {
    const rows = await (0, db_1.query)("SELECT * FROM orders WHERE order_no = ?", [order_no]);
    return rows[0] || null;
}
async function findByUser(user_id) {
    return (0, db_1.query)("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [user_id]);
}
async function updateStatus(order_no, status, extra) {
    const fields = ["status = ?", "updated_at = datetime('now')"];
    const values = [status];
    if (extra?.out_trade_no) {
        fields.push("out_trade_no = ?");
        values.push(extra.out_trade_no);
    }
    if (extra?.paid_at) {
        fields.push("paid_at = ?");
        values.push(extra.paid_at);
    }
    values.push(order_no);
    const result = await (0, db_1.query)(`UPDATE orders SET ${fields.join(", ")} WHERE order_no = ?`, values);
    return result.affectedRows > 0;
}
async function findPendingExpired(withinMinutes = 30) {
    return (0, db_1.query)(`SELECT * FROM orders WHERE status = 'pending'
     AND created_at < datetime('now', ? || ' minutes')`, [String(-withinMinutes)]);
}
