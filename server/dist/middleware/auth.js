"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.optionalAuth = optionalAuth;
exports.signToken = signToken;
exports.refreshToken = refreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid token" });
        return;
    }
    const token = header.slice(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
        try {
            const decoded = jsonwebtoken_1.default.verify(header.slice(7), getJwtSecret());
            req.user = decoded;
        }
        catch {
            // Ignore invalid tokens for optional auth
        }
    }
    next();
}
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}
function refreshToken(oldPayload, newPlan) {
    return signToken({ userId: oldPayload.userId, plan: newPlan });
}
