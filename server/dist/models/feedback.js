"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.findAll = findAll;
exports.markRead = markRead;
exports.findByUser = findByUser;
exports.markAllRead = markAllRead;
exports.getUnreadCount = getUnreadCount;
const db_1 = require("../config/db");
async function create(data) {
    const result = await (0, db_1.query)("INSERT INTO feedbacks (user_id, subject, message) VALUES (?, ?, ?)", [data.user_id, data.subject, data.message]);
    return {
        id: result.insertId,
        user_id: data.user_id,
        subject: data.subject,
        message: data.message,
        is_read: 0,
        reply: "",
        replied_at: null,
        created_at: new Date().toISOString(),
    };
}
async function findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [countRows] = await (0, db_1.query)("SELECT COUNT(*) as total FROM feedbacks");
    const total = countRows?.total || 0;
    const feedbacks = await (0, db_1.query)(`SELECT f.*, u.username, u.email
     FROM feedbacks f
     LEFT JOIN users u ON u.id = f.user_id
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`, [limit, offset]);
    return { feedbacks, total };
}
async function markRead(id) {
    await (0, db_1.query)("UPDATE feedbacks SET is_read = 1 WHERE id = ?", [id]);
}
async function findByUser(userId, page, limit) {
    const [count] = await (0, db_1.query)("SELECT COUNT(*) AS total FROM feedbacks WHERE user_id = ?", [userId]);
    const feedbacks = await (0, db_1.query)("SELECT id, subject, message, is_read, reply, replied_at, created_at FROM feedbacks WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?", [userId, limit, (page - 1) * limit]);
    return { feedbacks, total: Number(count.total), page, limit };
}
async function markAllRead() {
    await (0, db_1.query)("UPDATE feedbacks SET is_read = 1 WHERE is_read = 0");
}
async function getUnreadCount() {
    const [row] = await (0, db_1.query)("SELECT COUNT(*) as c FROM feedbacks WHERE is_read = 0");
    return row?.c || 0;
}
