"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.findAll = findAll;
const db_1 = require("../config/db");
async function create(adminId, action, targetType, targetId, detail) {
    await (0, db_1.query)("INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)", [adminId, action, targetType || null, targetId || null, detail || null]);
}
async function findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [countRows] = await (0, db_1.query)("SELECT COUNT(*) as total FROM admin_logs");
    const total = countRows?.total || 0;
    const logs = await (0, db_1.query)(`SELECT al.*, u.username as admin_name
     FROM admin_logs al
     LEFT JOIN users u ON u.id = al.admin_id
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`, [limit, offset]);
    return { logs, total };
}
