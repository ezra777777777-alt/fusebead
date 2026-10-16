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
const rateLimit_1 = require("../middleware/rateLimit");
const VerificationCode = __importStar(require("../models/verificationCode"));
const http_1 = require("../utils/http");
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
            contribution_points: Number(user.contribution_points || 0),
            created_at: user.created_at,
        });
    }
    catch (err) {
        console.error("[user] me error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Daily community check-in (Asia/Shanghai date)
exports.userRouter.get("/me/check-in", auth_1.authMiddleware, (0, http_1.asyncRoute)(async (req, res) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
    const rows = await (0, db_1.query)("SELECT id FROM user_checkins WHERE user_id = ? AND checkin_date = ?", [req.user.userId, date]);
    res.json({ checkedIn: rows.length > 0 });
}));
exports.userRouter.post("/me/check-in", auth_1.authMiddleware, (0, http_1.asyncRoute)(async (req, res) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
    const result = await (0, db_1.transaction)(async () => {
        await (0, db_1.query)("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user.userId]);
        const inserted = await (0, db_1.query)("INSERT INTO user_checkins (user_id, checkin_date) VALUES (?, ?) ON CONFLICT(user_id, checkin_date) DO NOTHING", [req.user.userId, date]);
        if (inserted.affectedRows)
            await (0, db_1.query)("UPDATE users SET contribution_points = contribution_points + 5 WHERE id = ?", [req.user.userId]);
        const [user] = await (0, db_1.query)("SELECT contribution_points FROM users WHERE id = ?", [req.user.userId]);
        return { checkedIn: true, awarded: inserted.affectedRows ? 5 : 0, contribution_points: Number(user.contribution_points) };
    });
    res.json(result);
}));
// Update current user
exports.userRouter.put("/me", auth_1.authMiddleware, async (req, res) => {
    try {
        const { username, avatar_url } = req.body;
        if (typeof username !== "string" || username.trim().length < 2 || username.trim().length > 40) {
            res.status(400).json({ error: "昵称需 2–40 字" });
            return;
        }
        let avatar = avatar_url;
        if (avatar !== undefined && avatar !== null) {
            try {
                if (typeof avatar !== "string" || avatar.length > 1000)
                    throw new Error();
                avatar = avatar.trim();
                if (avatar) {
                    const parsed = new URL(avatar);
                    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password)
                        throw new Error();
                    avatar = parsed.toString();
                }
            }
            catch {
                res.status(400).json({ error: "头像需使用有效的 HTTP/HTTPS 图片链接" });
                return;
            }
        }
        await User.update(req.user.userId, { username: username.trim(), avatar_url: avatar });
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
        const [community] = await (0, db_1.query)("SELECT COUNT(*) AS project_count, COALESCE(SUM(votes_count), 0) AS votes FROM projects WHERE user_id = ? AND status = 'approved' AND is_deleted = 0", [user.id]);
        const [patternCount] = await (0, db_1.query)("SELECT COUNT(*) as c FROM patterns WHERE user_id = ? AND is_public = TRUE AND is_deleted = FALSE", [user.id]);
        const [totalLikes] = await (0, db_1.query)("SELECT COALESCE(SUM(likes_count), 0) as c FROM patterns WHERE user_id = ? AND is_deleted = FALSE", [user.id]);
        res.json({
            id: user.id,
            username: user.username,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
            projectCount: Number(community.project_count), projectVotes: Number(community.votes), contribution_points: Number(user.contribution_points || 0),
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
exports.userRouter.get("/feedback", auth_1.authMiddleware, (0, http_1.asyncRoute)(async (req, res) => {
    res.json(await Feedback.findByUser(req.user.userId, (0, http_1.positiveInt)(req.query.page, 1), Math.min(50, (0, http_1.positiveInt)(req.query.limit, 10))));
}));
exports.userRouter.post("/feedback", auth_1.authMiddleware, (0, rateLimit_1.rateLimit)(10), (0, http_1.asyncRoute)(async (req, res) => {
    const { subject, message } = req.body;
    if (typeof subject !== "string" || !subject.trim() || subject.length > 200 || typeof message !== "string" || !message.trim() || message.length > 2000)
        throw new http_1.HttpError(400, "请填写 1–200 字的主题和 1–2000 字的内容");
    const feedback = await (0, db_1.transaction)(async () => {
        await (0, db_1.query)("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user.userId]);
        const existing = await (0, db_1.query)("SELECT id FROM feedbacks WHERE user_id = ? AND subject = ? AND message = ? AND COALESCE(reply, '') = ''", [req.user.userId, subject.trim(), message.trim()]);
        if (existing.length)
            throw new http_1.HttpError(409, "这条反馈已提交，请到个人中心查看处理进度");
        return Feedback.create({ user_id: req.user.userId, subject: subject.trim(), message: message.trim() });
    });
    res.json({ success: true, id: feedback.id });
}));
// Appeals cannot require an active account: banned users need this channel too.
exports.userRouter.post("/appeal", (0, rateLimit_1.rateLimit)(5), (0, http_1.asyncRoute)(async (req, res) => {
    const { email, message, captchaId, captchaText } = req.body;
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof message !== "string" || !message.trim() || message.length > 2000 || typeof captchaId !== "string" || typeof captchaText !== "string")
        throw new http_1.HttpError(400, "请填写注册邮箱、申诉说明和验证码");
    const valid = await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" });
    if (!valid)
        throw new http_1.HttpError(400, "验证码无效，请刷新后重试");
    const user = await User.findByEmail(email);
    if (user)
        await Feedback.create({ user_id: user.id, subject: "账号申诉 / 数据请求（邮箱身份尚未核实）", message: message.trim() });
    res.json({ success: true });
}));
