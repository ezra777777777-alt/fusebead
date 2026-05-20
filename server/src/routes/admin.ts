import { Router, Request, Response } from "express";
import { adminGuard } from "../middleware/admin";
import * as User from "../models/user";
import * as Pattern from "../models/pattern";
import * as AdminLog from "../models/adminLog";
import * as SystemSetting from "../models/systemSetting";
import * as Feedback from "../models/feedback";
import { query } from "../config/db";

export const adminRouter = Router();

// All routes require admin
adminRouter.use(adminGuard);

// ── Stats ──

adminRouter.get("/stats", async (_req: Request, res: Response) => {
  try {
    const userStats = await User.getStats();
    const patternStats = await Pattern.getStats();
    const [commentCount] = await query<any[]>("SELECT COUNT(*) as c FROM comments");
    res.json({
      totalUsers: userStats.totalUsers,
      totalPatterns: patternStats.totalPatterns,
      totalComments: commentCount?.c || 0,
      pendingPatterns: patternStats.pendingPatterns,
      todayGenerations: patternStats.todayPatterns,
    });
  } catch (err) {
    console.error("[admin] stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Users ──

adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const { page, limit, search } = req.query;
    const result = await User.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string | undefined,
    });
    // Strip password_hash
    const users = result.users.map((u) => ({
      id: u.id, username: u.username, email: u.email,
      avatar_url: u.avatar_url, plan: u.plan,
      is_admin: u.is_admin, is_banned: u.is_banned,
      created_at: u.created_at, updated_at: u.updated_at,
    }));
    res.json({ users, total: result.total });
  } catch (err) {
    console.error("[admin] users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(Number(req.params.id));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { password_hash, ...safe } = user as any;
    res.json(safe);
  } catch (err) {
    console.error("[admin] user get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { plan, is_banned, is_admin } = req.body;
    const updated = await User.updateAdmin(id, { plan, is_banned, is_admin });
    if (!updated) { res.status(400).json({ error: "No valid fields to update" }); return; }

    await AdminLog.create(req.user!.userId, "update_user", "user", id,
      JSON.stringify({ plan, is_banned, is_admin }));
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] user update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user!.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }
    await query("DELETE FROM users WHERE id = ?", [id]);
    await AdminLog.create(req.user!.userId, "delete_user", "user", id);
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] user delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Patterns ──

adminRouter.get("/patterns", async (req: Request, res: Response) => {
  try {
    const { status, page, limit, search } = req.query;
    const result = await Pattern.findAllAdmin({
      status: (status as "all" | "pending" | "approved" | "deleted") || "all",
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string | undefined,
    });
    res.json(result);
  } catch (err) {
    console.error("[admin] patterns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.put("/patterns/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { action } = req.body;
    const updates: { is_approved?: boolean; is_featured?: boolean; is_deleted?: boolean } = {};

    switch (action) {
      case "approve": updates.is_approved = true; break;
      case "reject": updates.is_approved = false; break;
      case "feature": updates.is_featured = true; break;
      case "unfeature": updates.is_featured = false; break;
      case "softDelete": updates.is_deleted = true; break;
      case "restore": updates.is_deleted = false; break;
      default: res.status(400).json({ error: "Invalid action" }); return;
    }

    await Pattern.updateAdmin(id, updates);
    await AdminLog.create(req.user!.userId, action, "pattern", id, JSON.stringify(updates));
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] pattern update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.delete("/patterns/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM patterns WHERE id = ?", [id]);
    await AdminLog.create(req.user!.userId, "hard_delete", "pattern", id);
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] pattern delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Comments ──

adminRouter.get("/comments", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const [countRows] = await query<any[]>("SELECT COUNT(*) as total FROM comments");
    const total = countRows?.total || 0;
    const comments = await query<any[]>(
      `SELECT c.*, u.username as author_name, p.title as pattern_title
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN patterns p ON p.id = c.pattern_id
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    res.json({ comments, total });
  } catch (err) {
    console.error("[admin] comments error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.delete("/comments/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM comments WHERE id = ?", [id]);
    await AdminLog.create(req.user!.userId, "delete_comment", "comment", id);
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] comment delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Logs ──

adminRouter.get("/logs", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await AdminLog.findAll(page, limit);
    res.json(result);
  } catch (err) {
    console.error("[admin] logs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Settings ──

adminRouter.get("/settings", async (_req: Request, res: Response) => {
  try {
    const settings = await SystemSetting.getAll();
    res.json(settings);
  } catch (err) {
    console.error("[admin] settings get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.put("/settings", async (req: Request, res: Response) => {
  try {
    const settings: { key: string; value: string }[] = req.body;
    if (!Array.isArray(settings)) {
      res.status(400).json({ error: "Expected array of {key, value}" });
      return;
    }
    await SystemSetting.setMany(settings);
    await AdminLog.create(req.user!.userId, "update_settings", "system_settings", undefined,
      JSON.stringify(settings.map(s => s.key)));
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] settings update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Feedback ──

adminRouter.get("/feedback", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await Feedback.findAll(page, limit);
    res.json(result);
  } catch (err) {
    console.error("[admin] feedback get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.post("/feedback/read-all", async (_req: Request, res: Response) => {
  try {
    await Feedback.markAllRead();
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] feedback read-all error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.post("/feedback/:id/read", async (req: Request, res: Response) => {
  try {
    await Feedback.markRead(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("[admin] feedback read error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.get("/feedback/unread-count", async (_req: Request, res: Response) => {
  try {
    const count = await Feedback.getUnreadCount();
    res.json({ count });
  } catch (err) {
    console.error("[admin] feedback count error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
