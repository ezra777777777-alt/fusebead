"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByUser = findByUser;
exports.add = add;
exports.remove = remove;
exports.isFavorited = isFavorited;
const db_1 = require("../config/db");
async function findByUser(userId) {
    return (0, db_1.query)(`SELECT p.* FROM patterns p
     INNER JOIN favorites f ON f.pattern_id = p.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`, [userId]);
}
async function add(userId, patternId) {
    await (0, db_1.query)("INSERT IGNORE INTO favorites (user_id, pattern_id) VALUES (?, ?)", [userId, patternId]);
}
async function remove(userId, patternId) {
    await (0, db_1.query)("DELETE FROM favorites WHERE user_id = ? AND pattern_id = ?", [userId, patternId]);
}
async function isFavorited(userId, patternId) {
    const rows = await (0, db_1.query)("SELECT 1 FROM favorites WHERE user_id = ? AND pattern_id = ?", [userId, patternId]);
    return rows.length > 0;
}
