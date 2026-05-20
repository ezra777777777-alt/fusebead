"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByEmail = findByEmail;
exports.findById = findById;
exports.create = create;
exports.verifyEmail = verifyEmail;
exports.update = update;
exports.findAll = findAll;
exports.updateAdmin = updateAdmin;
exports.getStats = getStats;
exports.upgradePlan = upgradePlan;
exports.updatePassword = updatePassword;
exports.checkSubscriptionExpiry = checkSubscriptionExpiry;
const db_1 = require("../config/db");
async function findByEmail(email) {
    const rows = await (0, db_1.query)("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0] || null;
}
async function findById(id) {
    const rows = await (0, db_1.query)("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
}
async function create(data) {
    const result = await (0, db_1.query)("INSERT INTO users (username, email, password_hash, email_verified) VALUES (?, ?, ?, ?)", [data.username, data.email, data.password_hash, data.email_verified ?? 0]);
    return { id: result.insertId, ...data, avatar_url: null, plan: "free", email_verified: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}
async function verifyEmail(email) {
    const result = await (0, db_1.query)("UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE email = ?", [email]);
    return result.affectedRows > 0;
}
async function update(id, data) {
    const fields = [];
    const values = [];
    if (data.username) {
        fields.push("username = ?");
        values.push(data.username);
    }
    if (data.avatar_url !== undefined) {
        fields.push("avatar_url = ?");
        values.push(data.avatar_url);
    }
    if (fields.length === 0)
        return;
    values.push(id);
    await (0, db_1.query)(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
}
async function findAll(opts = {}) {
    const { page = 1, limit = 20, search } = opts;
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    if (search) {
        conditions.push("(username LIKE ? OR email LIKE ?)");
        values.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [countRows] = await (0, db_1.query)(`SELECT COUNT(*) as total FROM users ${where}`, values);
    const total = countRows?.total || 0;
    const users = await (0, db_1.query)(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...values, limit, offset]);
    return { users, total };
}
async function updateAdmin(id, data) {
    const fields = [];
    const values = [];
    if (data.plan !== undefined) {
        fields.push("plan = ?");
        values.push(data.plan);
    }
    if (data.is_banned !== undefined) {
        fields.push("is_banned = ?");
        values.push(data.is_banned);
    }
    if (data.is_admin !== undefined) {
        fields.push("is_admin = ?");
        values.push(data.is_admin);
    }
    if (fields.length === 0)
        return false;
    values.push(id);
    const result = await (0, db_1.query)(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    return result.affectedRows > 0;
}
async function getStats() {
    const [total] = await (0, db_1.query)("SELECT COUNT(*) as c FROM users");
    const [today] = await (0, db_1.query)("SELECT COUNT(*) as c FROM users WHERE DATE(created_at) = DATE('now')");
    return { totalUsers: total?.c || 0, todayUsers: today?.c || 0 };
}
async function upgradePlan(id, plan, expiresAt) {
    await (0, db_1.query)("UPDATE users SET plan = ?, subscription_expires_at = ?, subscription_status = 'active', updated_at = datetime('now') WHERE id = ?", [plan, expiresAt, id]);
}
async function updatePassword(id, password_hash) {
    await (0, db_1.query)("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [password_hash, id]);
}
async function checkSubscriptionExpiry() {
    const result = await (0, db_1.query)(`UPDATE users SET plan = 'free', subscription_status = 'expired', subscription_expires_at = NULL, updated_at = datetime('now')
     WHERE subscription_status = 'active' AND subscription_expires_at IS NOT NULL AND subscription_expires_at <= datetime('now')
       AND plan != 'free'`);
    return result.affectedRows || 0;
}
