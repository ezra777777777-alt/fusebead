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
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User = __importStar(require("../models/user"));
const VerificationCode = __importStar(require("../models/verificationCode"));
const auth_1 = require("../middleware/auth");
const db_1 = require("../config/db");
const http_1 = require("../utils/http");
const authValidation_1 = require("../utils/authValidation");
const verificationEmail_1 = require("../utils/verificationEmail");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", (0, http_1.asyncRoute)(async (req, res) => {
    const { username, password, captchaId, captchaText } = req.body;
    const email = (0, authValidation_1.emailAddress)(req.body.email);
    (0, authValidation_1.validateNewPassword)(password);
    if (typeof username !== "string" || username.trim().length < 2 || username.length > 40)
        throw new http_1.HttpError(400, "昵称需 2–40 字");
    if (req.body.acceptedTerms !== true)
        throw new http_1.HttpError(400, "请先阅读并同意用户协议和隐私政策");
    if (typeof captchaId !== "string" || typeof captchaText !== "string" || !await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" }))
        throw new http_1.HttpError(400, "图形验证码错误或已过期，请刷新后重试");
    const password_hash = await bcryptjs_1.default.hash(password, 10);
    const user = await (0, db_1.transaction)(async () => {
        if (await User.findByEmail(email))
            throw new http_1.HttpError(409, "邮箱已注册，请登录或找回密码");
        try {
            return await User.create({ username: username.trim(), email, password_hash, email_verified: 0 });
        }
        catch (e) {
            if (e.code === "23505" || String(e.message).includes("UNIQUE constraint"))
                throw new http_1.HttpError(409, "邮箱已注册，请登录或找回密码");
            throw e;
        }
    });
    let emailSent = true;
    try {
        await (0, verificationEmail_1.sendEmailCode)(user.email, "email_verify");
    }
    catch {
        emailSent = false;
    }
    res.status(201).json({ success: true, email: user.email, emailSent });
}));
exports.authRouter.post("/login", (0, http_1.asyncRoute)(async (req, res) => {
    const email = (0, authValidation_1.emailAddress)(req.body.email);
    const { password, captchaId, captchaText } = req.body;
    if (typeof password !== "string" || !password || password.length > 128)
        throw new http_1.HttpError(400, "请填写邮箱和密码");
    if (typeof captchaId !== "string" || typeof captchaText !== "string" || !await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" }))
        throw new http_1.HttpError(400, "图形验证码错误或已过期，请刷新后重试");
    const user = await User.findByEmail(email);
    if (!user || !await bcryptjs_1.default.compare(password, user.password_hash))
        throw new http_1.HttpError(401, "邮箱或密码错误");
    if (user.is_banned) {
        res.status(403).json({ error: "账号已被封禁", code: "ACCOUNT_BANNED" });
        return;
    }
    if (!user.email_verified) {
        res.status(403).json({ error: "请先验证邮箱", code: "EMAIL_UNVERIFIED", email: user.email, needVerify: true });
        return;
    }
    const token = (0, auth_1.signToken)({ userId: user.id, plan: user.plan, tokenVersion: user.token_version });
    res.json({ token, user: {
            id: user.id, username: user.username, email: user.email,
            plan: user.plan, avatar_url: user.avatar_url, is_admin: !!user.is_admin,
            contribution_points: Number(user.contribution_points || 0),
            subscription_expires_at: user.subscription_expires_at, subscription_status: user.subscription_status,
        } });
}));
exports.authRouter.post("/forgot-password", (0, http_1.asyncRoute)(async (req, res) => {
    const user = await User.findByEmail((0, authValidation_1.emailAddress)(req.body.email));
    if (user) {
        // Keep the same response for unknown accounts, cooldowns and delivery failures.
        try {
            await (0, verificationEmail_1.sendEmailCode)(user.email, "password_reset");
        }
        catch (e) {
            if (!(e instanceof http_1.HttpError))
                throw e;
        }
    }
    res.json({ success: true });
}));
exports.authRouter.post("/reset-password", (0, http_1.asyncRoute)(async (req, res) => {
    const email = (0, authValidation_1.emailAddress)(req.body.email);
    const { code, password } = req.body;
    if (typeof code !== "string" || !/^\d{6}$/.test(code))
        throw new http_1.HttpError(400, "请输入 6 位数字验证码");
    (0, authValidation_1.validateNewPassword)(password);
    const password_hash = await bcryptjs_1.default.hash(password, 10);
    const changed = await (0, db_1.transaction)(async () => {
        const [user] = await (0, db_1.query)("SELECT * FROM users WHERE LOWER(email) = ? FOR UPDATE", [email]);
        if (!user || !await VerificationCode.verify({ email: user.email, code, type: "password_reset" }))
            return false;
        await User.updatePassword(user.id, password_hash);
        await (0, db_1.query)("DELETE FROM verification_codes WHERE email = ?", [user.email]);
        return true;
    });
    if (!changed)
        throw new http_1.HttpError(400, "验证码错误、已过期或尝试次数过多，请重新发送");
    res.json({ success: true });
}));
