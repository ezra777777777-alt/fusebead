import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as User from "../models/user";
import * as Pattern from "../models/pattern";
import * as Favorite from "../models/favorite";

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
