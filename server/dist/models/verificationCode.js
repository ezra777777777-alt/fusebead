"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.verify = verify;
exports.cleanupExpired = cleanupExpired;
exports.hasRecentCode = hasRecentCode;
const db_1 = require("../config/db");
async function create(params) {
    const ttl = params.ttlMinutes ?? (params.type === "captcha" ? 5 : 10);
    const result = await (0, db_1.query)("INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, datetime('now', ? || ' minutes'))", [params.email, params.code, params.type, String(ttl)]);
    return {
        id: result.insertId,
        email: params.email,
        code: params.code,
        type: params.type,
        expires_at: "",
        created_at: new Date().toISOString(),
    };
}
async function verify(params) {
    const rows = await (0, db_1.query)("SELECT id FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND expires_at > datetime('now') LIMIT 1", [params.email, params.code, params.type]);
    if (rows.length === 0)
        return false;
    await (0, db_1.query)("DELETE FROM verification_codes WHERE id = ?", [rows[0].id]);
    return true;
}
async function cleanupExpired() {
    await (0, db_1.query)("DELETE FROM verification_codes WHERE expires_at <= datetime('now')");
}
async function hasRecentCode(email, type, withinSeconds = 60) {
    const rows = await (0, db_1.query)("SELECT COUNT(*) as c FROM verification_codes WHERE email = ? AND type = ? AND created_at > datetime('now', ? || ' seconds')", [email, type, String(-withinSeconds)]);
    return (rows[0]?.c || 0) > 0;
}
