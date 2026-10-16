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
exports.authMiddleware = authMiddleware;
exports.optionalAuth = optionalAuth;
exports.signToken = signToken;
exports.refreshToken = refreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User = __importStar(require("../models/user"));
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === "fallback-secret") {
        if (process.env.NODE_ENV === "production") {
            console.error("[auth] FATAL: JWT_SECRET is not set in production");
            process.exit(1);
        }
        return "dev-secret-do-not-use-in-production";
    }
    return secret;
}
async function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token || "", getJwtSecret());
        if (!Number.isInteger(decoded.userId))
            throw new Error("Invalid token");
    }
    catch {
        res.status(401).json({ error: "登录已失效，请重新登录", code: "AUTH_REQUIRED" });
        return;
    }
    try {
        const user = await User.findById(decoded.userId);
        if (user && (decoded.tokenVersion ?? 0) !== user.token_version) {
            res.status(401).json({ error: "密码已更新，请重新登录", code: "AUTH_REQUIRED" });
            return;
        }
        if (!user || user.is_banned || !user.email_verified) {
            res.status(user ? 403 : 401).json({
                error: user?.is_banned ? "账号已被封禁，如有异议请通过社区反馈申诉" : "请先完成邮箱验证",
                code: user?.is_banned ? "ACCOUNT_BANNED" : "AUTH_REQUIRED",
            });
            return;
        }
        req.user = { userId: user.id, plan: user.plan, isAdmin: !!user.is_admin, tokenVersion: user.token_version };
        next();
    }
    catch (error) {
        next(error);
    }
}
async function optionalAuth(req, _res, next) {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    let decoded = null;
    try {
        if (token)
            decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
    }
    catch { /* visitor */ }
    try {
        if (decoded && Number.isInteger(decoded.userId)) {
            const user = await User.findById(decoded.userId);
            if (user && !user.is_banned && user.email_verified && (decoded.tokenVersion ?? 0) === user.token_version)
                req.user = { userId: user.id, plan: user.plan, isAdmin: !!user.is_admin, tokenVersion: user.token_version };
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}
function refreshToken(oldPayload, newPlan) {
    return signToken({ userId: oldPayload.userId, plan: newPlan, tokenVersion: oldPayload.tokenVersion });
}
