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
exports.adminRouter = void 0;
const express_1 = require("express");
const admin_1 = require("../middleware/admin");
const User = __importStar(require("../models/user"));
const Pattern = __importStar(require("../models/pattern"));
const AdminLog = __importStar(require("../models/adminLog"));
const SystemSetting = __importStar(require("../models/systemSetting"));
const Feedback = __importStar(require("../models/feedback"));
const db_1 = require("../config/db");
exports.adminRouter = (0, express_1.Router)();
// All routes require admin
exports.adminRouter.use(admin_1.adminGuard);
// ── Stats ──
exports.adminRouter.get("/stats", async (_req, res) => {
    try {
        const userStats = await User.getStats();
        const patternStats = await Pattern.getStats();
        const [commentCount] = await (0, db_1.query)("SELECT COUNT(*) as c FROM comments");
        res.json({
            totalUsers: userStats.totalUsers,
            totalPatterns: patternStats.totalPatterns,
            totalComments: commentCount?.c || 0,
            pendingPatterns: patternStats.pendingPatterns,
            todayGenerations: patternStats.todayPatterns,
        });
    }
    catch (err) {
        console.error("[admin] stats error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Users ──
exports.adminRouter.get("/users", async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const result = await User.findAll({
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
            search: search,
        });
        // Strip password_hash
        const users = result.users.map((u) => ({
            id: u.id, username: u.username, email: u.email,
            avatar_url: u.avatar_url, plan: u.plan,
            is_admin: u.is_admin, is_banned: u.is_banned,
            subscription_expires_at: u.subscription_expires_at,
            subscription_status: u.subscription_status,
            created_at: u.created_at, updated_at: u.updated_at,
        }));
        res.json({ users, total: result.total });
    }
    catch (err) {
        console.error("[admin] users error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.get("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(Number(req.params.id));
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const { password_hash, ...safe } = user;
        res.json(safe);
    }
    catch (err) {
        console.error("[admin] user get error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.put("/users/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { plan, is_banned, is_admin, subscription_days } = req.body;
        const updates = {
            plan,
            is_banned,
            is_admin,
        };
        if (plan === "free") {
            updates.subscription_expires_at = null;
            updates.subscription_status = "none";
        }
        else if ((plan === "pro" || plan === "team") && subscription_days !== undefined) {
            const days = Number(subscription_days);
            if (!Number.isFinite(days) || days < 1 || days > 3650) {
                res.status(400).json({ error: "Invalid subscription days" });
                return;
            }
            updates.subscription_expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            updates.subscription_status = "active";
        }
        const updated = await User.updateAdmin(id, updates);
        if (!updated) {
            res.status(400).json({ error: "No valid fields to update" });
            return;
        }
        await AdminLog.create(req.user.userId, "update_user", "user", id, JSON.stringify({ plan, is_banned, is_admin, subscription_days }));
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] user update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.delete("/users/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (id === req.user.userId) {
            res.status(400).json({ error: "Cannot delete your own account" });
            return;
        }
        await (0, db_1.query)("DELETE FROM users WHERE id = ?", [id]);
        await AdminLog.create(req.user.userId, "delete_user", "user", id);
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] user delete error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Patterns ──
exports.adminRouter.get("/patterns", async (req, res) => {
    try {
        const { status, page, limit, search } = req.query;
        const result = await Pattern.findAllAdmin({
            status: status || "all",
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
            search: search,
        });
        res.json(result);
    }
    catch (err) {
        console.error("[admin] patterns error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.put("/patterns/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { action } = req.body;
        const updates = {};
        switch (action) {
            case "approve":
                updates.is_approved = true;
                break;
            case "reject":
                updates.is_approved = false;
                break;
            case "feature":
                updates.is_featured = true;
                break;
            case "unfeature":
                updates.is_featured = false;
                break;
            case "softDelete":
                updates.is_deleted = true;
                break;
            case "restore":
                updates.is_deleted = false;
                break;
            default:
                res.status(400).json({ error: "Invalid action" });
                return;
        }
        await Pattern.updateAdmin(id, updates);
        await AdminLog.create(req.user.userId, action, "pattern", id, JSON.stringify(updates));
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] pattern update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.delete("/patterns/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        await (0, db_1.query)("DELETE FROM patterns WHERE id = ?", [id]);
        await AdminLog.create(req.user.userId, "hard_delete", "pattern", id);
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] pattern delete error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Comments ──
exports.adminRouter.get("/comments", async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const [countRows] = await (0, db_1.query)("SELECT COUNT(*) as total FROM comments");
        const total = countRows?.total || 0;
        const comments = await (0, db_1.query)(`SELECT c.*, u.username as author_name, p.title as pattern_title
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN patterns p ON p.id = c.pattern_id
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`, [limit, offset]);
        res.json({ comments, total });
    }
    catch (err) {
        console.error("[admin] comments error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.delete("/comments/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        await (0, db_1.query)("DELETE FROM comments WHERE id = ?", [id]);
        await AdminLog.create(req.user.userId, "delete_comment", "comment", id);
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] comment delete error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Logs ──
exports.adminRouter.get("/logs", async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const result = await AdminLog.findAll(page, limit);
        res.json(result);
    }
    catch (err) {
        console.error("[admin] logs error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Settings ──
exports.adminRouter.get("/settings", async (_req, res) => {
    try {
        const settings = await SystemSetting.getAll();
        res.json(settings);
    }
    catch (err) {
        console.error("[admin] settings get error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.put("/settings", async (req, res) => {
    try {
        const settings = req.body;
        if (!Array.isArray(settings)) {
            res.status(400).json({ error: "Expected array of {key, value}" });
            return;
        }
        await SystemSetting.setMany(settings);
        await AdminLog.create(req.user.userId, "update_settings", "system_settings", undefined, JSON.stringify(settings.map(s => s.key)));
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] settings update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Feedback ──
exports.adminRouter.get("/feedback", async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const result = await Feedback.findAll(page, limit);
        res.json(result);
    }
    catch (err) {
        console.error("[admin] feedback get error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.post("/feedback/read-all", async (_req, res) => {
    try {
        await Feedback.markAllRead();
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] feedback read-all error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.post("/feedback/:id/read", async (req, res) => {
    try {
        await Feedback.markRead(Number(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        console.error("[admin] feedback read error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.adminRouter.get("/feedback/unread-count", async (_req, res) => {
    try {
        const count = await Feedback.getUnreadCount();
        res.json({ count });
    }
    catch (err) {
        console.error("[admin] feedback count error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
