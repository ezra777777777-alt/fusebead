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
exports.userRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const User = __importStar(require("../models/user"));
const Pattern = __importStar(require("../models/pattern"));
const Favorite = __importStar(require("../models/favorite"));
const Feedback = __importStar(require("../models/feedback"));
const db_1 = require("../config/db");
exports.userRouter = (0, express_1.Router)();
// Get current user
exports.userRouter.get("/me", auth_1.authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            plan: user.plan,
            is_admin: !!user.is_admin,
            subscription_expires_at: user.subscription_expires_at,
            subscription_status: user.subscription_status,
            created_at: user.created_at,
        });
    }
    catch (err) {
        console.error("[user] me error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Update current user
exports.userRouter.put("/me", auth_1.authMiddleware, async (req, res) => {
    try {
        const { username, avatar_url } = req.body;
        await User.update(req.user.userId, { username, avatar_url });
        res.json({ success: true });
    }
    catch (err) {
        console.error("[user] update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get user's patterns
exports.userRouter.get("/me/patterns", auth_1.authMiddleware, async (req, res) => {
    try {
        const patterns = await Pattern.findByUserId(req.user.userId);
        res.json(patterns);
    }
    catch (err) {
        console.error("[user] patterns error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get user's favorites
exports.userRouter.get("/me/favorites", auth_1.authMiddleware, async (req, res) => {
    try {
        const favorites = await Favorite.findByUser(req.user.userId);
        res.json(favorites);
    }
    catch (err) {
        console.error("[user] favorites error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Refresh JWT token after plan upgrade
exports.userRouter.post("/me/refresh-token", auth_1.authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const token = (0, auth_1.refreshToken)(req.user, user.plan);
        res.json({ token });
    }
    catch (err) {
        console.error("[user] refresh-token error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get public user profile
exports.userRouter.get("/profile/:id", async (req, res) => {
    try {
        const user = await User.findById(Number(req.params.id));
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const [patternCount] = await (0, db_1.query)("SELECT COUNT(*) as c FROM patterns WHERE user_id = ? AND is_public = TRUE AND is_deleted = FALSE", [user.id]);
        const [totalLikes] = await (0, db_1.query)("SELECT COALESCE(SUM(likes_count), 0) as c FROM patterns WHERE user_id = ? AND is_deleted = FALSE", [user.id]);
        res.json({
            id: user.id,
            username: user.username,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
            patternCount: patternCount?.c || 0,
            totalLikes: totalLikes?.c || 0,
        });
    }
    catch (err) {
        console.error("[user] profile error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get user stats
exports.userRouter.get("/me/stats", auth_1.authMiddleware, async (req, res) => {
    try {
        const [patternCount] = await (0, db_1.query)("SELECT COUNT(*) as c FROM patterns WHERE user_id = ? AND is_deleted = FALSE", [req.user.userId]);
        const [favoriteCount] = await (0, db_1.query)("SELECT COUNT(*) as c FROM favorites WHERE user_id = ?", [req.user.userId]);
        const [downloadSum] = await (0, db_1.query)("SELECT COALESCE(SUM(downloads_count), 0) as c FROM patterns WHERE user_id = ? AND is_deleted = FALSE", [req.user.userId]);
        res.json({
            patternCount: patternCount?.c || 0,
            favoriteCount: favoriteCount?.c || 0,
            totalDownloads: downloadSum?.c || 0,
        });
    }
    catch (err) {
        console.error("[user] stats error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Submit feedback
exports.userRouter.post("/feedback", auth_1.authMiddleware, async (req, res) => {
    try {
        const { subject, message } = req.body;
        if (!subject || !message) {
            res.status(400).json({ error: "Subject and message required" });
            return;
        }
        await Feedback.create({
            user_id: req.user.userId,
            subject: String(subject).slice(0, 200),
            message: String(message).slice(0, 2000),
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error("[user] feedback error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
