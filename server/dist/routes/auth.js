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
const mailer_1 = require("../utils/mailer");
const auth_1 = require("../middleware/auth");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", async (req, res) => {
    try {
        const { username, email, password, captchaId, captchaText } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        // Validate CAPTCHA
        if (!captchaId || !captchaText) {
            res.status(400).json({ error: "CAPTCHA required" });
            return;
        }
        const captchaValid = await VerificationCode.verify({
            email: captchaId,
            code: String(captchaText).toUpperCase(),
            type: "captcha",
        });
        if (!captchaValid) {
            res.status(400).json({ error: "Invalid or expired CAPTCHA" });
            return;
        }
        const existing = await User.findByEmail(email);
        if (existing) {
            res.status(409).json({ error: "Email already registered" });
            return;
        }
        const password_hash = await bcryptjs_1.default.hash(password, 10);
        const user = await User.create({ username, email, password_hash, email_verified: 0 });
        // Send verification email
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await VerificationCode.create({ email, code, type: "email_verify", ttlMinutes: 10 });
        try {
            await (0, mailer_1.sendVerificationCode)(email, code);
        }
        catch (mailErr) {
            console.error("[auth] send email error:", mailErr);
            // Don't fail — user is created, they can resend verification later
        }
        res.status(201).json({ success: true, email: user.email });
    }
    catch (err) {
        console.error("[auth] register error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.authRouter.post("/login", async (req, res) => {
    try {
        const { email, password, captchaId, captchaText } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: "Missing email or password" });
            return;
        }
        // Validate CAPTCHA
        if (!captchaId || !captchaText) {
            res.status(400).json({ error: "CAPTCHA required" });
            return;
        }
        const captchaValid = await VerificationCode.verify({
            email: captchaId,
            code: String(captchaText).toUpperCase(),
            type: "captcha",
        });
        if (!captchaValid) {
            res.status(400).json({ error: "Invalid or expired CAPTCHA" });
            return;
        }
        const user = await User.findByEmail(email);
        if (!user) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        // Check email verified
        if (!user.email_verified) {
            res.status(403).json({ error: "Email not verified", email: user.email, needVerify: true });
            return;
        }
        const token = (0, auth_1.signToken)({ userId: user.id, plan: user.plan });
        res.json({
            token,
            user: {
                id: user.id, username: user.username, email: user.email,
                plan: user.plan, avatar_url: user.avatar_url, is_admin: !!user.is_admin,
            },
        });
    }
    catch (err) {
        console.error("[auth] login error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Forgot password — send reset code
exports.authRouter.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: "Email required" });
            return;
        }
        const user = await User.findByEmail(email);
        // Don't reveal whether user exists — always return success
        if (!user) {
            res.json({ success: true });
            return;
        }
        // Rate limit: max 1 reset request per 60s
        const recent = await VerificationCode.hasRecentCode(email, "password_reset", 60);
        if (recent) {
            res.json({ success: true });
            return;
        }
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await VerificationCode.create({ email, code, type: "password_reset", ttlMinutes: 10 });
        try {
            await (0, mailer_1.sendVerificationCode)(email, code, "password_reset");
        }
        catch (mailErr) {
            console.error("[auth] send reset email error:", mailErr);
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error("[auth] forgot-password error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Reset password using code
exports.authRouter.post("/reset-password", async (req, res) => {
    try {
        const { email, code, password } = req.body;
        if (!email || !code || !password) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: "Password must be at least 6 characters" });
            return;
        }
        const valid = await VerificationCode.verify({ email, code, type: "password_reset" });
        if (!valid) {
            res.status(400).json({ error: "Invalid or expired code" });
            return;
        }
        const user = await User.findByEmail(email);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const password_hash = await bcryptjs_1.default.hash(password, 10);
        await User.updatePassword(user.id, password_hash);
        res.json({ success: true });
    }
    catch (err) {
        console.error("[auth] reset-password error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
