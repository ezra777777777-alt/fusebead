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
exports.patternsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Pattern = __importStar(require("../models/pattern"));
const Favorite = __importStar(require("../models/favorite"));
const db_1 = require("../config/db");
exports.patternsRouter = (0, express_1.Router)();
// List public patterns
exports.patternsRouter.get("/", auth_1.optionalAuth, async (req, res) => {
    try {
        const { category, sort, page, limit, search, userId } = req.query;
        const result = await Pattern.findAll({
            category: category,
            sort: sort || "newest",
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 12,
            search: search,
            userId: userId ? Number(userId) : undefined,
        });
        res.json(result);
    }
    catch (err) {
        console.error("[patterns] list error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get single pattern
exports.patternsRouter.get("/:id", auth_1.optionalAuth, async (req, res) => {
    try {
        const pattern = await Pattern.findById(Number(req.params.id));
        if (!pattern) {
            res.status(404).json({ error: "Pattern not found" });
            return;
        }
        // Get author name
        const [userRow] = await (0, db_1.query)("SELECT username FROM users WHERE id = ?", [pattern.user_id]);
        const authorName = userRow?.username || "Anonymous";
        // Check if current user liked this pattern
        let isLiked = false;
        if (req.user) {
            isLiked = await Favorite.isFavorited(req.user.userId, pattern.id);
        }
        res.json({ ...pattern, author_name: authorName, is_liked: isLiked });
    }
    catch (err) {
        console.error("[patterns] get error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Create pattern (auth required)
exports.patternsRouter.post("/", auth_1.authMiddleware, async (req, res) => {
    try {
        const { title, description, category, brand, gridSize, gridData, colorCounts, isPublic } = req.body;
        if (!title || !brand || !gridSize || !gridData) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        const pattern = await Pattern.create({
            userId: req.user.userId,
            title,
            description,
            category,
            brand,
            gridSize,
            gridData: JSON.stringify(gridData),
            colorCounts: colorCounts ? JSON.stringify(colorCounts) : undefined,
            isPublic,
        });
        res.status(201).json(pattern);
    }
    catch (err) {
        console.error("[patterns] create error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Publish draft (make public)
exports.patternsRouter.put("/:id/publish", auth_1.authMiddleware, async (req, res) => {
    try {
        const pattern = await Pattern.findById(Number(req.params.id));
        if (!pattern || pattern.user_id !== req.user.userId) {
            res.status(404).json({ error: "Pattern not found" });
            return;
        }
        await (0, db_1.query)("UPDATE patterns SET is_public = TRUE WHERE id = ?", [pattern.id]);
        res.json({ success: true });
    }
    catch (err) {
        console.error("[patterns] publish error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Delete pattern (auth required, own only)
exports.patternsRouter.delete("/:id", auth_1.authMiddleware, async (req, res) => {
    try {
        const deleted = await Pattern.remove(Number(req.params.id), req.user.userId);
        if (!deleted) {
            res.status(404).json({ error: "Pattern not found" });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error("[patterns] delete error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Like pattern (auth required)
exports.patternsRouter.post("/:id/like", auth_1.authMiddleware, async (req, res) => {
    try {
        const patternId = Number(req.params.id);
        const pattern = await Pattern.findById(patternId);
        if (!pattern) {
            res.status(404).json({ error: "Pattern not found" });
            return;
        }
        const alreadyLiked = await Favorite.isFavorited(req.user.userId, patternId);
        if (alreadyLiked) {
            await Favorite.remove(req.user.userId, patternId);
            res.json({ liked: false });
        }
        else {
            await Favorite.add(req.user.userId, patternId);
            await Pattern.incrementLikes(patternId);
            res.json({ liked: true });
        }
    }
    catch (err) {
        console.error("[patterns] like error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Download count
exports.patternsRouter.post("/:id/download", async (req, res) => {
    try {
        await Pattern.incrementDownloads(Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        console.error("[patterns] download error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Comments ──
// List comments for a pattern
exports.patternsRouter.get("/:id/comments", async (req, res) => {
    try {
        const patternId = Number(req.params.id);
        const comments = await (0, db_1.query)(`SELECT c.id, c.content, c.created_at, u.username, u.avatar_url, u.id as user_id
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.pattern_id = ?
       ORDER BY c.created_at ASC`, [patternId]);
        res.json(comments);
    }
    catch (err) {
        console.error("[patterns] comments list error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Add comment
exports.patternsRouter.post("/:id/comments", auth_1.authMiddleware, async (req, res) => {
    try {
        const patternId = Number(req.params.id);
        const { content } = req.body;
        if (!content || !String(content).trim()) {
            res.status(400).json({ error: "Comment content required" });
            return;
        }
        await (0, db_1.query)("INSERT INTO comments (user_id, pattern_id, content) VALUES (?, ?, ?)", [req.user.userId, patternId, String(content).trim().slice(0, 1000)]);
        res.status(201).json({ success: true });
    }
    catch (err) {
        console.error("[patterns] comment create error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Delete own comment
exports.patternsRouter.delete("/:id/comments/:commentId", auth_1.authMiddleware, async (req, res) => {
    try {
        const commentId = Number(req.params.commentId);
        await (0, db_1.query)("DELETE FROM comments WHERE id = ? AND user_id = ?", [commentId, req.user.userId]);
        res.json({ success: true });
    }
    catch (err) {
        console.error("[patterns] comment delete error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
