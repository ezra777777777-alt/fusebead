import { Router, Request, Response } from "express";
import { authMiddleware, refreshToken } from "../middleware/auth";
import * as User from "../models/user";
import * as Pattern from "../models/pattern";
import * as Favorite from "../models/favorite";
import * as Feedback from "../models/feedback";
import { query, transaction } from "../config/db";

import { rateLimit } from "../middleware/rateLimit";
import * as VerificationCode from "../models/verificationCode";
import { asyncRoute, HttpError, positiveInt } from "../utils/http";

export const userRouter = Router();

// Get current user
userRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
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
  } catch (err) {
    console.error("[user] me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Daily community check-in (Asia/Shanghai date)
userRouter.get("/me/check-in", authMiddleware, asyncRoute(async (req, res) => {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  const rows = await query<any[]>("SELECT id FROM user_checkins WHERE user_id = ? AND checkin_date = ?", [req.user!.userId, date]);
  res.json({ checkedIn: rows.length > 0 });
}));
userRouter.post("/me/check-in", authMiddleware, asyncRoute(async (req, res) => {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
  const result = await transaction(async () => {
    await query("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user!.userId]);
    const inserted = await query("INSERT INTO user_checkins (user_id, checkin_date) VALUES (?, ?) ON CONFLICT(user_id, checkin_date) DO NOTHING", [req.user!.userId, date]);
    if (inserted.affectedRows) await query("UPDATE users SET contribution_points = contribution_points + 5 WHERE id = ?", [req.user!.userId]);
    const [user] = await query<any[]>("SELECT contribution_points FROM users WHERE id = ?", [req.user!.userId]);
    return { checkedIn: true, awarded: inserted.affectedRows ? 5 : 0, contribution_points: Number(user.contribution_points) };
  });
  res.json(result);
}));

// Update current user
userRouter.put("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, avatar_url } = req.body;
    if (typeof username !== "string" || username.trim().length < 2 || username.trim().length > 40) {
      res.status(400).json({ error: "昵称需 2–40 字" }); return;
    }
    let avatar = avatar_url;
    if (avatar !== undefined && avatar !== null) {
      try {
        if (typeof avatar !== "string" || avatar.length > 1000) throw new Error();
        avatar = avatar.trim();
        if (avatar) {
          const parsed = new URL(avatar);
          if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
          avatar = parsed.toString();
        }
      } catch { res.status(400).json({ error: "头像需使用有效的 HTTP/HTTPS 图片链接" }); return; }
    }
    await User.update(req.user!.userId, { username: username.trim(), avatar_url: avatar });
    res.json({ success: true });
  } catch (err) {
    console.error("[user] update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's patterns
userRouter.get("/me/patterns", authMiddleware, async (req: Request, res: Response) => {
  try {
    const patterns = await Pattern.findByUserId(req.user!.userId);
    res.json(patterns);
  } catch (err) {
    console.error("[user] patterns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's favorites
userRouter.get("/me/favorites", authMiddleware, async (req: Request, res: Response) => {
  try {
    const favorites = await Favorite.findByUser(req.user!.userId);
    res.json(favorites);
  } catch (err) {
    console.error("[user] favorites error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Refresh JWT token after plan upgrade
userRouter.post("/me/refresh-token", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const token = refreshToken(req.user!, user.plan);
    res.json({ token });
  } catch (err) {
    console.error("[user] refresh-token error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get public user profile
userRouter.get("/profile/:id", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(Number(req.params.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [community] = await query<any[]>("SELECT COUNT(*) AS project_count, COALESCE(SUM(votes_count), 0) AS votes FROM projects WHERE user_id = ? AND status = 'approved' AND is_deleted = 0", [user.id]);
    const [patternCount] = await query<any[]>(
      "SELECT COUNT(*) as c FROM patterns WHERE user_id = ? AND is_public = TRUE AND is_deleted = FALSE",
      [user.id]
    );
    const [totalLikes] = await query<any[]>(
      "SELECT COALESCE(SUM(likes_count), 0) as c FROM patterns WHERE user_id = ? AND is_deleted = FALSE",
      [user.id]
    );
    res.json({
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      projectCount: Number(community.project_count), projectVotes: Number(community.votes), contribution_points: Number(user.contribution_points || 0),
      patternCount: patternCount?.c || 0,
      totalLikes: totalLikes?.c || 0,
    });
  } catch (err) {
    console.error("[user] profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user stats
userRouter.get("/me/stats", authMiddleware, async (req: Request, res: Response) => {
  try {
    const [patternCount] = await query<any[]>(
      "SELECT COUNT(*) as c FROM patterns WHERE user_id = ? AND is_deleted = FALSE",
      [req.user!.userId]
    );
    const [favoriteCount] = await query<any[]>(
      "SELECT COUNT(*) as c FROM favorites WHERE user_id = ?",
      [req.user!.userId]
    );
    const [downloadSum] = await query<any[]>(
      "SELECT COALESCE(SUM(downloads_count), 0) as c FROM patterns WHERE user_id = ? AND is_deleted = FALSE",
      [req.user!.userId]
    );
    res.json({
      patternCount: patternCount?.c || 0,
      favoriteCount: favoriteCount?.c || 0,
      totalDownloads: downloadSum?.c || 0,
    });
  } catch (err) {
    console.error("[user] stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

userRouter.get("/feedback", authMiddleware, asyncRoute(async (req, res) => {
  res.json(await Feedback.findByUser(req.user!.userId, positiveInt(req.query.page, 1), Math.min(50, positiveInt(req.query.limit, 10))));
}));

userRouter.post("/feedback", authMiddleware, rateLimit(10), asyncRoute(async (req, res) => {
  const { subject, message } = req.body;
  if (typeof subject !== "string" || !subject.trim() || subject.length > 200 || typeof message !== "string" || !message.trim() || message.length > 2000) throw new HttpError(400, "请填写 1–200 字的主题和 1–2000 字的内容");
  const feedback = await transaction(async () => {
    await query("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user!.userId]);
    const existing = await query<any[]>("SELECT id FROM feedbacks WHERE user_id = ? AND subject = ? AND message = ? AND COALESCE(reply, '') = ''", [req.user!.userId, subject.trim(), message.trim()]);
    if (existing.length) throw new HttpError(409, "这条反馈已提交，请到个人中心查看处理进度");
    return Feedback.create({ user_id: req.user!.userId, subject: subject.trim(), message: message.trim() });
  });
  res.json({ success: true, id: feedback.id });
}));

// Appeals cannot require an active account: banned users need this channel too.
userRouter.post("/appeal", rateLimit(5), asyncRoute(async (req, res) => {
  const { email, message, captchaId, captchaText } = req.body;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof message !== "string" || !message.trim() || message.length > 2000 || typeof captchaId !== "string" || typeof captchaText !== "string") throw new HttpError(400, "请填写注册邮箱、申诉说明和验证码");
  const valid = await VerificationCode.verify({ email: captchaId, code: captchaText.toUpperCase(), type: "captcha" });
  if (!valid) throw new HttpError(400, "验证码无效，请刷新后重试");
  const user = await User.findByEmail(email);
  if (user) await Feedback.create({ user_id: user.id, subject: "账号申诉 / 数据请求（邮箱身份尚未核实）", message: message.trim() });
  res.json({ success: true });
}));
