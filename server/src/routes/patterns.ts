import { Router, Request, Response } from "express";
import { authMiddleware, optionalAuth } from "../middleware/auth";
import * as Pattern from "../models/pattern";
import * as Favorite from "../models/favorite";

export const patternsRouter = Router();

// List public patterns
patternsRouter.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { category, sort, page, limit } = req.query;
    const result = await Pattern.findAll({
      category: category as string | undefined,
      sort: (sort as "newest" | "popular") || "newest",
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
    });
    res.json(result);
  } catch (err) {
    console.error("[patterns] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single pattern
patternsRouter.get("/:id", optionalAuth, async (req: Request, res: Response) => {
  try {
    const pattern = await Pattern.findById(Number(req.params.id));
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" });
      return;
    }
    res.json(pattern);
  } catch (err) {
    console.error("[patterns] get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create pattern (auth required)
patternsRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, category, brand, gridSize, gridData, colorCounts, isPublic } = req.body;

    if (!title || !brand || !gridSize || !gridData) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const pattern = await Pattern.create({
      userId: req.user!.userId,
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
  } catch (err) {
    console.error("[patterns] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete pattern (auth required, own only)
patternsRouter.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const deleted = await Pattern.remove(Number(req.params.id), req.user!.userId);
    if (!deleted) {
      res.status(404).json({ error: "Pattern not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[patterns] delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Like pattern (auth required)
patternsRouter.post("/:id/like", authMiddleware, async (req: Request, res: Response) => {
  try {
    const patternId = Number(req.params.id);
    const pattern = await Pattern.findById(patternId);
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" });
      return;
    }

    const alreadyLiked = await Favorite.isFavorited(req.user!.userId, patternId);
    if (alreadyLiked) {
      await Favorite.remove(req.user!.userId, patternId);
      res.json({ liked: false });
    } else {
      await Favorite.add(req.user!.userId, patternId);
      await Pattern.incrementLikes(patternId);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error("[patterns] like error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Download count
patternsRouter.post("/:id/download", async (req: Request, res: Response) => {
  try {
    await Pattern.incrementDownloads(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("[patterns] download error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
