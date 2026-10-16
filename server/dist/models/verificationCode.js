"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.verify = verify;
exports.cleanupExpired = cleanupExpired;
exports.hasRecentCode = hasRecentCode;
const db_1 = require("../config/db");
async function create(params) {
    const ttl = params.ttlMinutes ?? (params.type === "captcha" ? 5 : 10);
    return (0, db_1.transaction)(async () => {
        await (0, db_1.query)("DELETE FROM verification_codes WHERE email = ? AND type = ?", [params.email, params.type]);
        const result = await (0, db_1.query)("INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, datetime('now', ? || ' minutes'))", [params.email, params.code, params.type, String(ttl)]);
        return {
            id: result.insertId,
            email: params.email,
            code: params.code,
            type: params.type,
            expires_at: "",
            created_at: new Date().toISOString(),
            attempts: 0,
        };
    });
}
async function verify(params) {
    if (typeof params.email !== "string" || typeof params.code !== "string")
        return false;
    return (0, db_1.transaction)(async () => {
        const [row] = await (0, db_1.query)("SELECT * FROM verification_codes WHERE email = ? AND type = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1 FOR UPDATE", [params.email, params.type]);
        if (!row || row.attempts >= 5)
            return false;
        if (row.code !== params.code) {
            await (0, db_1.query)("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?", [row.id]);
            return false;
        }
        const result = await (0, db_1.query)("DELETE FROM verification_codes WHERE id = ?", [row.id]);
        return result.affectedRows === 1;
    });
}
async function cleanupExpired() {
    await (0, db_1.query)("DELETE FROM verification_codes WHERE expires_at <= datetime('now')");
}
async function hasRecentCode(email, type, withinSeconds = 60) {
    const rows = await (0, db_1.query)("SELECT COUNT(*) as c FROM verification_codes WHERE email = ? AND type = ? AND created_at > datetime('now', ? || ' seconds')", [email, type, String(-withinSeconds)]);
    return (rows[0]?.c || 0) > 0;
}
