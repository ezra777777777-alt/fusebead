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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const captcha_1 = require("../utils/captcha");
const VerificationCode = __importStar(require("../models/verificationCode"));
const User = __importStar(require("../models/user"));
const auth_1 = require("../middleware/auth");
const db_1 = require("../config/db");
const http_1 = require("../utils/http");
const authValidation_1 = require("../utils/authValidation");
const verificationEmail_1 = require("../utils/verificationEmail");
exports.verificationRouter = (0, express_1.Router)();
exports.verificationRouter.get("/captcha", (0, http_1.asyncRoute)(async (_req, res) => {
    const text = (0, captcha_1.generateCaptchaText)(4);
    const captchaId = crypto_1.default.randomUUID();
    await VerificationCode.create({ email: captchaId, code: text, type: "captcha", ttlMinutes: 5 });
    res.json({ captchaId, svgBase64: (0, captcha_1.renderCaptchaSvg)(text) });
}));
exports.verificationRouter.post("/send-code", (0, http_1.asyncRoute)(async (req, res) => {
    const email = (0, authValidation_1.emailAddress)(req.body.email);
    const { captchaId, captchaText } = req.body;
    if (typeof captchaId !== "string" || typeof captchaText !== "string" || !await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" }))
        throw new http_1.HttpError(400, "图形验证码错误或已过期，请刷新后重试");
    const user = await User.findByEmail(email);
    if (user && !user.email_verified && !user.is_banned)
        await (0, verificationEmail_1.sendEmailCode)(user.email, "email_verify");
    res.json({ success: true });
}));
exports.verificationRouter.post("/verify-code", (0, http_1.asyncRoute)(async (req, res) => {
    const email = (0, authValidation_1.emailAddress)(req.body.email);
    const { code } = req.body;
    if (typeof code !== "string" || !/^\d{6}$/.test(code))
        throw new http_1.HttpError(400, "请输入 6 位数字验证码");
    const user = await (0, db_1.transaction)(async () => {
        const [row] = await (0, db_1.query)("SELECT * FROM users WHERE LOWER(email) = ? FOR UPDATE", [email]);
        if (!row || row.email_verified || row.is_banned)
            return null;
        if (!await VerificationCode.verify({ email: row.email, code, type: "email_verify" }))
            return null;
        await User.verifyEmail(row.email);
        await (0, db_1.query)("DELETE FROM verification_codes WHERE email = ? AND type = 'email_verify'", [row.email]);
        return row;
    });
    if (!user)
        throw new http_1.HttpError(400, "验证码错误、已过期或尝试次数过多；已验证的账号请直接登录");
    const token = (0, auth_1.signToken)({ userId: user.id, plan: user.plan, tokenVersion: user.token_version });
    res.json({ token, user: {
            id: user.id, username: user.username, email: user.email,
            avatar_url: user.avatar_url, plan: user.plan, is_admin: !!user.is_admin,
            contribution_points: Number(user.contribution_points || 0),
            subscription_expires_at: user.subscription_expires_at, subscription_status: user.subscription_status,
        } });
}));
