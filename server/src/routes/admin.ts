import { Router, Request, Response } from "express";
import { adminGuard } from "../middleware/admin";
import * as User from "../models/user";
import * as Pattern from "../models/pattern";
import * as AdminLog from "../models/adminLog";
import * as SystemSetting from "../models/systemSetting";
import * as Feedback from "../models/feedback";
import { query, transaction } from "../config/db";
import { checkWebsiteResource, markWebsiteResourcePublished, releaseWebsiteResource } from "./resource-registry";

import { asyncRoute, HttpError, positiveInt } from "../utils/http";

export const adminRouter = Router();

// All routes require admin
adminRouter.use(adminGuard);

// ── Stats ──

adminRouter.get("/stats", async (_req: Request, res: Response) => {
  try {
    const userStats = await User.getStats();
    const patternStats = await Pattern.getStats();
    const [commentCount] = await query<any[]>("SELECT COUNT(*) as c FROM comments");
    const [community] = await query<any[]>("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'pending' AND is_deleted = 0 THEN 1 ELSE 0 END) AS pending FROM projects");
    const [reports] = await query<any[]>("SELECT COUNT(*) AS total FROM project_reports WHERE status = 'open'");
    res.json({
      totalProjects: Number(community.total), pendingProjects: Number(community.pending || 0), openReports: Number(reports.total),
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
      subscription_expires_at: u.subscription_expires_at,
      subscription_status: u.subscription_status,
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
    const { plan, is_banned, is_admin, subscription_days } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 || (plan !== undefined && !["free", "pro", "team"].includes(plan)) || (is_banned !== undefined && typeof is_banned !== "boolean") || (is_admin !== undefined && typeof is_admin !== "boolean")) {
      res.status(400).json({ error: "用户设置格式不正确" }); return;
    }
    if (id === req.user!.userId && (is_banned === true || is_admin === false)) { res.status(400).json({ error: "不能封禁自己或移除自己的管理员权限" }); return; }
    const updates: Partial<Pick<User.UserRow, "plan" | "is_banned" | "is_admin" | "subscription_expires_at" | "subscription_status">> = {
      plan,
      is_banned,
      is_admin,
    };

    if (plan === "free") {
      updates.subscription_expires_at = null;
      updates.subscription_status = "none";
    } else if ((plan === "pro" || plan === "team") && subscription_days !== undefined) {
      const days = Number(subscription_days);
      if (!Number.isFinite(days) || days < 1 || days > 3650) {
        res.status(400).json({ error: "Invalid subscription days" });
        return;
      }
      updates.subscription_expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      updates.subscription_status = "active";
    }

    const updated = await User.updateAdmin(id, updates);
    if (!updated) { res.status(400).json({ error: "No valid fields to update" }); return; }

    await AdminLog.create(req.user!.userId, "update_user", "user", id,
      JSON.stringify({ plan, is_banned, is_admin, subscription_days }));
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

// ── Cyber projects ──

adminRouter.get("/projects", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = String(req.query.status || "all");
    const search = String(req.query.search || "").trim().slice(0, 80);
    const conditions: string[] = [];
    const values: any[] = [];
    if (status === "deleted") conditions.push("p.is_deleted = 1");
    else {
      conditions.push("p.is_deleted = 0");
      if (["pending", "approved", "rejected", "withdrawn"].includes(status)) { conditions.push("p.status = ?"); values.push(status); }
    }
    if (search) { conditions.push("(p.title LIKE ? OR p.summary LIKE ? OR u.username LIKE ?)"); values.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [count] = await query<any[]>(`SELECT COUNT(*) AS total FROM projects p LEFT JOIN users u ON u.id = p.user_id ${where}`, values);
    const projects = await query<any[]>(
      `SELECT p.*, u.username AS author_name FROM projects p LEFT JOIN users u ON u.id = p.user_id
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    res.json({ projects, total: Number(count?.total || 0) });
  } catch (err) {
    console.error("[admin] projects error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

adminRouter.put("/projects/:id", asyncRoute(async (req, res) => {
  const id = positiveInt(req.params.id);
  const action = String(req.body.action || "");
  const note = typeof req.body.note === "string" ? req.body.note.trim() : "";
  if (note.length > 1000 || (["reject", "softDelete"].includes(action) && !note)) throw new HttpError(400, "退回或下架时请填写原因（最多 1000 字）");
  await transaction(async () => {
    const [project] = await query<any[]>("SELECT * FROM projects WHERE id = ? FOR UPDATE", [id]);
    if (!project) throw new HttpError(404, "作品不存在");
    if (positiveInt(req.body.revision) !== project.revision) throw new HttpError(409, "作者或其他管理员已更新作品，请刷新后审核");
    if (action === "approve") {
      if (project.is_deleted || project.status !== "pending") throw new HttpError(409, "只能放行待审核的作品");
      await checkWebsiteResource(project.id, project.revision, project.repo_url || project.demo_url);
      await markWebsiteResourcePublished(project.id, project.repo_url || project.demo_url);
      await query("UPDATE projects SET status = 'approved', moderation_note = '' WHERE id = ?", [id]);
      const award = await query("INSERT INTO contribution_events (user_id, event_key, points) VALUES (?, ?, 10) ON CONFLICT(user_id, event_key) DO NOTHING", [project.user_id, `project:${id}`]);
      if (award.affectedRows) await query("UPDATE users SET contribution_points = contribution_points + 10 WHERE id = ?", [project.user_id]);
    } else if (action === "reject") {
      if (project.is_deleted || project.status !== "pending") throw new HttpError(409, "只能退回待审核的作品");
      await releaseWebsiteResource(project.id, project.repo_url || project.demo_url, "rejected");
      await query("UPDATE projects SET status = 'rejected', moderation_note = ?, is_featured = 0 WHERE id = ?", [note, id]);
    } else if (action === "softDelete") {
      await query("UPDATE projects SET is_deleted = 1, is_featured = 0, moderation_note = ? WHERE id = ?", [note, id]);
    } else if (action === "restore") {
      if (!project.is_deleted) throw new HttpError(409, "作品未被下架");
      await checkWebsiteResource(project.id, project.revision, project.repo_url || project.demo_url);
      await query("UPDATE projects SET is_deleted = 0, status = 'pending', moderation_note = '' WHERE id = ?", [id]);
    } else if (["feature", "unfeature"].includes(action)) {
      if (project.is_deleted || project.status !== "approved") throw new HttpError(409, "只能推荐已公开作品");
      await query("UPDATE projects SET is_featured = ? WHERE id = ?", [action === "feature" ? 1 : 0, id]);
    } else throw new HttpError(400, "操作无效");
    await query("UPDATE projects SET revision = revision + 1, updated_at = datetime('now') WHERE id = ?", [id]);
    await AdminLog.create(req.user!.userId, action, "project", id, note);
  });
  res.json({ success: true });
}));

adminRouter.get("/project-reports", asyncRoute(async (req, res) => {
  const page = positiveInt(req.query.page, 1);
  const conditions = req.query.status === "open" ? "WHERE r.status = 'open'" : "";
  const [count] = await query<any[]>(`SELECT COUNT(*) AS total FROM project_reports r ${conditions}`);
  const reports = await query(`SELECT r.*, p.title AS project_title, p.is_deleted AS project_deleted, u.username AS reporter_name
    FROM project_reports r LEFT JOIN projects p ON p.id = r.project_id LEFT JOIN users u ON u.id = r.user_id
    ${conditions} ORDER BY r.created_at DESC, r.id DESC LIMIT 20 OFFSET ?`, [(page - 1) * 20]);
  res.json({ reports, total: Number(count.total) });
}));

adminRouter.put("/project-reports/:id", asyncRoute(async (req, res) => {
  const id = positiveInt(req.params.id);
  const status = req.body.status;
  const note = typeof req.body.note === "string" ? req.body.note.trim() : "";
  if (!["open", "resolved"].includes(status) || note.length > 1000 || (status === "resolved" && !note)) throw new HttpError(400, "请填写处理结论（最多 1000 字）");
  const result = await query("UPDATE project_reports SET status = ?, resolution_note = ? WHERE id = ?", [status, status === "open" ? "" : note, id]);
  if (!result.affectedRows) throw new HttpError(404, "举报不存在");
  await AdminLog.create(req.user!.userId, `report_${status}`, "project_report", id, note);
  res.json({ success: true });
}));

adminRouter.get("/project-comments", asyncRoute(async (req, res) => {
  const page = positiveInt(req.query.page, 1);
  const [count] = await query<any[]>("SELECT COUNT(*) AS total FROM project_comments WHERE is_deleted = 0");
  const comments = await query(`SELECT c.*, u.username AS author_name, p.title AS project_title FROM project_comments c
    LEFT JOIN users u ON u.id = c.user_id LEFT JOIN projects p ON p.id = c.project_id WHERE c.is_deleted = 0
    ORDER BY c.created_at DESC, c.id DESC LIMIT 20 OFFSET ?`, [(page - 1) * 20]);
  res.json({ comments, total: Number(count.total) });
}));
adminRouter.delete("/project-comments/:id", asyncRoute(async (req, res) => {
  const id = positiveInt(req.params.id);
  await transaction(async () => {
    const [comment] = await query<any[]>("SELECT * FROM project_comments WHERE id = ?", [id]);
    if (!comment) throw new HttpError(404, "评论不存在");
    await query("SELECT id FROM projects WHERE id = ? FOR UPDATE", [comment.project_id]);
    const result = await query("UPDATE project_comments SET is_deleted = 1 WHERE id = ? AND is_deleted = 0", [id]);
    if (result.affectedRows) await query("UPDATE projects SET comments_count = CASE WHEN comments_count > 0 THEN comments_count - 1 ELSE 0 END WHERE id = ?", [comment.project_id]);
    await AdminLog.create(req.user!.userId, "delete_comment", "project_comment", id);
  });
  res.json({ success: true });
}));

// ── Legacy patterns ──

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

adminRouter.get("/feedback", asyncRoute(async (req, res) => {
  res.json(await Feedback.findAll(positiveInt(req.query.page, 1), Math.min(50, positiveInt(req.query.limit, 20))));
}));

adminRouter.post("/feedback/:id/reply", asyncRoute(async (req, res) => {
  const id = positiveInt(req.params.id);
  const { reply } = req.body;
  if (typeof reply !== "string" || !reply.trim() || reply.length > 2000) throw new HttpError(400, "回复需 1–2000 字");
  await transaction(async () => {
    const result = await query("UPDATE feedbacks SET reply = ?, replied_at = datetime('now'), is_read = 1 WHERE id = ?", [reply.trim(), id]);
    if (!result.affectedRows) throw new HttpError(404, "反馈不存在");
    await AdminLog.create(req.user!.userId, "reply_feedback", "feedback", id);
  });
  res.json({ success: true });
}));

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
