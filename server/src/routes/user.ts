import { Router, Request, Response } from "express";
import { authMiddleware, refreshToken } from "../middleware/auth";
import * as User from "../models/user";
import * as Pattern from "../models/pattern";
import * as Favorite from "../models/favorite";
import * as Feedback from "../models/feedback";
import { query } from "../config/db";

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
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("[user] me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update current user
userRouter.put("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, avatar_url } = req.body;
    await User.update(req.user!.userId, { username, avatar_url });
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

// Submit feedback
userRouter.post("/feedback", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      res.status(400).json({ error: "Subject and message required" });
      return;
    }
    await Feedback.create({
      user_id: req.user!.userId,
      subject: String(subject).slice(0, 200),
      message: String(message).slice(0, 2000),
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[user] feedback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
