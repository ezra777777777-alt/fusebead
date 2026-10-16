"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailAddress = emailAddress;
exports.validateNewPassword = validateNewPassword;
const http_1 = require("./http");
function emailAddress(value) {
    if (typeof value !== "string")
        throw new http_1.HttpError(400, "请填写有效邮箱");
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new http_1.HttpError(400, "请填写有效邮箱");
    return email;
}
function validateNewPassword(value) {
    if (typeof value !== "string" || value.length < 8 || Buffer.byteLength(value, "utf8") > 72) {
        throw new http_1.HttpError(400, "密码至少 8 位，最多 72 字节（中文占多个字节）");
    }
}
