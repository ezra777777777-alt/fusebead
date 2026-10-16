"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailCode = sendEmailCode;
const crypto_1 = require("crypto");
const db_1 = require("../config/db");
const VerificationCode = __importStar(require("../models/verificationCode"));
const mailer_1 = require("./mailer");
const http_1 = require("./http");
async function sendEmailCode(email, type) {
    const record = await (0, db_1.transaction)(async () => {
        await (0, db_1.query)("SELECT id FROM users WHERE email = ? FOR UPDATE", [email]);
        if (await VerificationCode.hasRecentCode(email, type, 60))
            throw new http_1.HttpError(429, "请等待 60 秒后再发送验证码");
        const [previous] = await (0, db_1.query)("SELECT code FROM verification_codes WHERE email = ? AND type = ? ORDER BY id DESC LIMIT 1", [email, type]);
        let code;
        do {
            code = String((0, crypto_1.randomInt)(100000, 1000000));
        } while (code === previous?.code);
        return VerificationCode.create({ email, code, type, ttlMinutes: 10 });
    });
    try {
        await (0, mailer_1.sendVerificationCode)(email, record.code, type);
    }
    catch {
        await (0, db_1.query)("DELETE FROM verification_codes WHERE id = ?", [record.id]);
        throw new http_1.HttpError(503, "邮件暂时无法发送，请稍后重试");
    }
}
