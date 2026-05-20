"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAll = getAll;
exports.set = set;
exports.setMany = setMany;
const db_1 = require("../config/db");
async function getAll() {
    const rows = await (0, db_1.query)("SELECT setting_key, setting_value FROM system_settings");
    const result = {};
    for (const row of rows) {
        result[row.setting_key] = row.setting_value || "";
    }
    return result;
}
async function set(key, value) {
    await (0, db_1.query)("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value", [key, value]);
}
async function setMany(settings) {
    for (const s of settings) {
        await set(s.key, s.value);
    }
}
