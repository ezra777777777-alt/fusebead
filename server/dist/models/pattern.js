"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.findById = findById;
exports.findByUserId = findByUserId;
exports.create = create;
exports.remove = remove;
exports.incrementLikes = incrementLikes;
exports.incrementDownloads = incrementDownloads;
exports.findAllAdmin = findAllAdmin;
exports.updateAdmin = updateAdmin;
exports.getStats = getStats;
const db_1 = require("../config/db");
async function findAll(filters = {}) {
    const { category, sort = "newest", page = 1, limit = 12, search, userId } = filters;
    const conditions = ["p.is_public = TRUE", "p.is_deleted = FALSE", "p.is_approved = TRUE"];
    const values = [];
    if (category) {
        conditions.push("p.category = ?");
        values.push(category);
    }
    if (search) {
        conditions.push("(p.title LIKE ? OR p.description LIKE ?)");
        values.push(`%${search}%`, `%${search}%`);
    }
    if (userId) {
        conditions.push("p.user_id = ?");
        values.push(userId);
    }
    const where = `WHERE ${conditions.join(" AND ")}`;
    const orderBy = sort === "popular" ? "ORDER BY p.likes_count DESC" : "ORDER BY p.created_at DESC";
    const offset = (page - 1) * limit;
    const [countRows] = await (0, db_1.query)(`SELECT COUNT(*) as total FROM patterns p ${where}`, values);
    const total = countRows?.total || 0;
    const patterns = await (0, db_1.query)(`SELECT p.*, u.username as author_name
     FROM patterns p
     LEFT JOIN users u ON u.id = p.user_id
     ${where} ${orderBy} LIMIT ? OFFSET ?`, [...values, limit, offset]);
    return { patterns, total };
}
async function findById(id) {
    const rows = await (0, db_1.query)("SELECT * FROM patterns WHERE id = ?", [id]);
    return rows[0] || null;
}
async function findByUserId(userId) {
    return (0, db_1.query)("SELECT * FROM patterns WHERE user_id = ? ORDER BY created_at DESC", [userId]);
}
async function create(data) {
    const result = await (0, db_1.query)(`INSERT INTO patterns (user_id, title, description, category, brand, grid_size, grid_data, color_counts, is_public)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [data.userId, data.title, data.description || null, data.category || null, data.brand, data.gridSize,
        data.gridData, data.colorCounts || null, data.isPublic ?? true]);
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
    };
}
async function remove(id, userId) {
    const result = await (0, db_1.query)("DELETE FROM patterns WHERE id = ? AND user_id = ?", [id, userId]);
    return result.affectedRows > 0;
}
async function incrementLikes(id) {
    await (0, db_1.query)("UPDATE patterns SET likes_count = likes_count + 1 WHERE id = ?", [id]);
}
async function incrementDownloads(id) {
    await (0, db_1.query)("UPDATE patterns SET downloads_count = downloads_count + 1 WHERE id = ?", [id]);
}
// ── Admin functions ──
async function findAllAdmin(opts = {}) {
    const { status = "all", page = 1, limit = 20, search } = opts;
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    if (status === "pending") {
        conditions.push("is_approved = FALSE AND is_deleted = FALSE");
    }
    else if (status === "approved") {
        conditions.push("is_approved = TRUE AND is_deleted = FALSE");
    }
    else if (status === "deleted") {
        conditions.push("is_deleted = TRUE");
    }
    if (search) {
        conditions.push("(title LIKE ? OR description LIKE ?)");
        values.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [countRows] = await (0, db_1.query)(`SELECT COUNT(*) as total FROM patterns ${where}`, values);
    const total = countRows?.total || 0;
    const patterns = await (0, db_1.query)(`SELECT p.*, u.username as author_name
     FROM patterns p
     LEFT JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`, [...values, limit, offset]);
    return { patterns, total };
}
async function updateAdmin(id, data) {
    const fields = [];
    const values = [];
    if (data.is_approved !== undefined) {
        fields.push("is_approved = ?");
        values.push(data.is_approved);
    }
    if (data.is_featured !== undefined) {
        fields.push("is_featured = ?");
        values.push(data.is_featured);
    }
    if (data.is_deleted !== undefined) {
        fields.push("is_deleted = ?");
        values.push(data.is_deleted);
    }
    if (fields.length === 0)
        return false;
    values.push(id);
    const result = await (0, db_1.query)(`UPDATE patterns SET ${fields.join(", ")} WHERE id = ?`, values);
    return result.affectedRows > 0;
}
async function getStats() {
    const [total] = await (0, db_1.query)("SELECT COUNT(*) as c FROM patterns WHERE is_deleted = FALSE");
    const [pending] = await (0, db_1.query)("SELECT COUNT(*) as c FROM patterns WHERE is_approved = FALSE AND is_deleted = FALSE");
    const [today] = await (0, db_1.query)("SELECT COUNT(*) as c FROM patterns WHERE DATE(created_at) = DATE('now')");
    return {
        totalPatterns: total?.c || 0,
        pendingPatterns: pending?.c || 0,
        todayPatterns: today?.c || 0,
    };
}
