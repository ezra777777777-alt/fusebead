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
const mailer_1 = require("../utils/mailer");
const VerificationCode = __importStar(require("../models/verificationCode"));
const User = __importStar(require("../models/user"));
const auth_1 = require("../middleware/auth");
exports.verificationRouter = (0, express_1.Router)();
// Generate CAPTCHA
exports.verificationRouter.get("/captcha", async (_req, res) => {
    try {
        const text = (0, captcha_1.generateCaptchaText)(4);
        const captchaId = crypto_1.default.randomUUID();
        const svgBase64 = (0, captcha_1.renderCaptchaSvg)(text);
        await VerificationCode.create({ email: captchaId, code: text, type: "captcha", ttlMinutes: 5 });
        res.json({ captchaId, svgBase64 });
    }
    catch (err) {
        console.error("[verification] captcha error:", err);
        res.status(500).json({ error: "Failed to generate CAPTCHA" });
    }
});
// Send verification code to email (requires CAPTCHA)
exports.verificationRouter.post("/send-code", async (req, res) => {
    try {
        const { email, captchaId, captchaText } = req.body;
        if (!email || !captchaId || !captchaText) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        // Validate CAPTCHA
        const captchaValid = await VerificationCode.verify({ email: captchaId, code: captchaText?.toUpperCase?.() || captchaText, type: "captcha" });
        if (!captchaValid) {
            res.status(400).json({ error: "Invalid or expired CAPTCHA" });
            return;
        }
        // Rate limit: max 1 code per 60s per email
        const recent = await VerificationCode.hasRecentCode(email, "email_verify", 60);
        if (recent) {
            res.status(429).json({ error: "Please wait before requesting another code" });
            return;
        }
        // Generate and store code
        const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
        await VerificationCode.create({ email, code, type: "email_verify", ttlMinutes: 10 });
        // Send email
        try {
            await (0, mailer_1.sendVerificationCode)(email, code);
        }
        catch (mailErr) {
            console.error("[verification] send email error:", mailErr);
            res.status(500).json({ error: "Failed to send verification email. Please check SMTP configuration." });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error("[verification] send-code error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Verify email code and activate account
exports.verificationRouter.post("/verify-code", async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        const valid = await VerificationCode.verify({ email, code, type: "email_verify" });
        if (!valid) {
            res.status(400).json({ error: "Invalid or expired verification code" });
            return;
        }
        // Activate user
        await User.verifyEmail(email);
        // Log user in
        const user = await User.findByEmail(email);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const token = (0, auth_1.signToken)({ userId: user.id, plan: user.plan });
        res.json({
            token,
            user: {
                id: user.id, username: user.username, email: user.email,
                avatar_url: user.avatar_url, plan: user.plan, is_admin: !!user.is_admin,
            },
        });
    }
    catch (err) {
        console.error("[verification] verify-code error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
