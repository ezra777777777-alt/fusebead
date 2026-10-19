import { Router, Request, static as serveStatic } from "express";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { authMiddleware, optionalAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { query, transaction } from "../config/db";
import { asyncRoute, HttpError, positiveInt } from "../utils/http";

export const projectsRouter = Router();
const coverDirectory = path.resolve(process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : "data", "covers");
projectsRouter.use("/covers", serveStatic(coverDirectory, { index: false, dotfiles: "deny", setHeaders: res => res.setHeader("X-Content-Type-Options", "nosniff") }));
projectsRouter.post("/cover", authMiddleware, rateLimit(6), rateLimit(30, 24 * 60 * 60 * 1000), asyncRoute(async (req, res) => {
  const image = req.body.image;
  if (typeof image !== "string" || image.length > 2_800_000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new HttpError(400, "请选择不超过 2 MB 的 PNG、JPEG 或 WebP 图片");
  let response;
  try {
    response = await fetch(`${process.env.PROCESSOR_URL || "http://localhost:5000"}/prepare-cover`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }), signal: AbortSignal.timeout(15000),
    });
  } catch { throw new HttpError(503, "图片处理服务暂时不可用，请稍后再试"); }
  if (!response.ok) throw new HttpError(response.status === 400 ? 400 : 503, response.status === 400 ? "图片无法读取，或尺寸超过 1200 万像素" : "图片处理服务暂时不可用");
  const prepared = await response.json() as { image: string };
  const filename = `${randomUUID()}.jpg`;
  await mkdir(coverDirectory, { recursive: true });
  await writeFile(path.join(coverDirectory, filename), Buffer.from(prepared.image, "base64"), { mode: 0o600, flag: "wx" });
  res.status(201).json({ path: `/projects/covers/${filename}` });
}));
const githubCategory = "GitHub 实用项目";
const categories = new Set(["能跑就行", "AI 套壳", "网页小玩具", "手机端", "游戏乱炖", "纯抽象", "教程与求助", githubCategory]);

function text(value: unknown, max: number, required = false): string {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new HttpError(400, "内容为空或超过字数限制");
  return value.trim();
}
function url(value: unknown, required = false) {
  const raw = text(value, 1000, required);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
    return parsed.toString();
  } catch { throw new HttpError(400, "请输入有效的 HTTP/HTTPS 链接"); }
}
function projectInput(body: Record<string, unknown>) {
  const title = text(body.title, 80, true);
  const summary = text(body.summary, 240, true);
  const category = text(body.category, 40, true);
  if (!categories.has(category) || body.acceptedRules !== true) throw new HttpError(400, "请选择分区并同意社区投稿规则");
  const github = category === githubCategory;
  let repoUrl = url(body.repoUrl, github);
  if (github) {
    const repo = new URL(repoUrl);
    const repositoryPath = repo.pathname.replace(/\/$/, "").replace(/\.git$/, "");
    if (repo.origin !== "https://github.com" || !/^\/[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?\/[a-z\d_.-]+$/i.test(repositoryPath)) {
      throw new HttpError(400, "请填写 GitHub 仓库主页：https://github.com/作者/项目");
    }
    repoUrl = `${repo.origin}${repositoryPath}`;
  }
  return [title, summary, category, url(body.demoUrl, !github) || repoUrl, repoUrl, text(body.techStack, 120), text(body.confession, 1500), url(body.coverUrl)];
}
async function visibleProject(req: Request, lock = false) {
  const id = positiveInt(req.params.id);
  const [project] = await query<any[]>(`SELECT * FROM projects WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  if (!project || (project.is_deleted && !req.user?.isAdmin && project.user_id !== req.user?.userId) ||
    (project.status !== "approved" && project.user_id !== req.user?.userId && !req.user?.isAdmin)) throw new HttpError(404, "作品不存在或尚未公开");
  return project;
}
async function approvedProject(req: Request) {
  const project = await visibleProject(req, true);
  if (project.status !== "approved" || project.is_deleted) throw new HttpError(409, "作品尚未公开或已下架");
  return project;
}

projectsRouter.get("/", optionalAuth, asyncRoute(async (req, res) => {
  const page = positiveInt(req.query.page, 1);
  const limit = Math.min(50, positiveInt(req.query.limit, 20));
  const values: unknown[] = [];
  const conditions = ["p.status = 'approved'", "p.is_deleted = 0"];
  const category = text(req.query.category, 40);
  const search = text(req.query.search, 80);
  if (category && category !== "全部") { conditions.push("p.category = ?"); values.push(category); }
  if (search) {
    conditions.push("(LOWER(p.title) LIKE ? ESCAPE '!' OR LOWER(p.summary) LIKE ? ESCAPE '!' OR LOWER(p.tech_stack) LIKE ? ESCAPE '!' OR LOWER(u.username) LIKE ? ESCAPE '!' OR LOWER(p.repo_url) LIKE ? ESCAPE '!')");
    values.push(...Array(5).fill(`%${search.toLowerCase().replace(/[!%_]/g, "!$&")}%`));
  }
  if (req.query.authorId) { conditions.push("p.user_id = ?"); values.push(positiveInt(req.query.authorId)); }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const sort = req.query.sort === "popular" ? "p.votes_count DESC" : req.query.sort === "discussed" ? "p.comments_count DESC" : "p.created_at DESC";
  const [count] = await query<any[]>(`SELECT COUNT(*) AS total FROM projects p LEFT JOIN users u ON u.id = p.user_id ${where}`, values);
  const projects = await query<any[]>(`SELECT p.*, u.username AS author_name, COALESCE(u.contribution_points, 0) AS author_points
    FROM projects p LEFT JOIN users u ON u.id = p.user_id ${where} ORDER BY ${sort}, p.id DESC LIMIT ? OFFSET ?`, [...values, limit, (page - 1) * limit]);
  res.json({ projects: projects.map(({ moderation_note, ...project }) => project), total: Number(count.total), page, limit });
}));

projectsRouter.get("/mine", authMiddleware, asyncRoute(async (req, res) => {
  res.json(await query("SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC, id DESC", [req.user!.userId]));
}));
projectsRouter.get("/my-reports", authMiddleware, asyncRoute(async (req, res) => {
  res.json(await query(`SELECT r.*, p.title AS project_title FROM project_reports r LEFT JOIN projects p ON p.id = r.project_id
    WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC`, [req.user!.userId]));
}));

projectsRouter.get("/:id", optionalAuth, asyncRoute(async (req, res) => {
  const project = await visibleProject(req);
  const [author] = await query<any[]>("SELECT username, avatar_url, contribution_points FROM users WHERE id = ?", [project.user_id]);
  const votes = req.user ? await query<any[]>("SELECT id FROM project_votes WHERE project_id = ? AND user_id = ?", [project.id, req.user.userId]) : [];
  if (project.status === "approved" && !project.is_deleted) {
    await query("UPDATE projects SET views_count = views_count + 1 WHERE id = ?", [project.id]);
    project.views_count++;
  }
  if (project.user_id !== req.user?.userId && !req.user?.isAdmin) delete project.moderation_note;
  res.json({ ...project, author_name: author?.username, author_avatar: author?.avatar_url, author_points: author?.contribution_points || 0, has_voted: votes.length > 0 });
}));

projectsRouter.post("/", authMiddleware, rateLimit(5), asyncRoute(async (req, res) => {
  const values = projectInput(req.body);
  const id = await transaction(async () => {
    await query("SELECT id FROM users WHERE id = ? FOR UPDATE", [req.user!.userId]);
    const existing = await query<any[]>("SELECT id FROM projects WHERE user_id = ? AND title = ? AND demo_url = ? AND is_deleted = 0 AND status = 'pending'", [req.user!.userId, values[0], values[3]]);
    if (existing.length) throw new HttpError(409, "相同作品正在审核，请到个人中心查看");
    const result = await query(`INSERT INTO projects (user_id, title, summary, category, demo_url, repo_url, tech_stack, confession, cover_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`, [req.user!.userId, ...values]);
    return result.insertId;
  });
  res.status(201).json({ id, status: "pending" });
}));

projectsRouter.put("/:id", authMiddleware, rateLimit(10), asyncRoute(async (req, res) => {
  const values = projectInput(req.body);
  await transaction(async () => {
    const project = await visibleProject(req, true);
    if (project.user_id !== req.user!.userId) throw new HttpError(403, "只能修改自己的作品");
    if (project.is_deleted) throw new HttpError(409, "作品已被管理员下架，请先通过反馈申诉");
    if (positiveInt(req.body.revision) !== project.revision) throw new HttpError(409, "作品已更新，请刷新后再修改");
    await query(`UPDATE projects SET title = ?, summary = ?, category = ?, demo_url = ?, repo_url = ?, tech_stack = ?, confession = ?, cover_url = ?,
      status = 'pending', moderation_note = '', is_featured = 0, revision = revision + 1, updated_at = datetime('now') WHERE id = ?`, [...values, project.id]);
  });
  res.json({ id: Number(req.params.id), status: "pending" });
}));

projectsRouter.post("/:id/withdraw", authMiddleware, asyncRoute(async (req, res) => {
  await transaction(async () => {
    const project = await visibleProject(req, true);
    if (project.user_id !== req.user!.userId) throw new HttpError(403, "只能撤回自己的作品");
    if (project.is_deleted) throw new HttpError(409, "作品已下架");
    if (positiveInt(req.body.revision) !== project.revision) throw new HttpError(409, "作品已更新，请刷新列表");
    await query("UPDATE projects SET status = 'withdrawn', is_featured = 0, revision = revision + 1, updated_at = datetime('now') WHERE id = ?", [project.id]);
  });
  res.json({ success: true });
}));

projectsRouter.post("/:id/vote", authMiddleware, rateLimit(30), asyncRoute(async (req, res) => {
  if (typeof req.body.voted !== "boolean") throw new HttpError(400, "请指定点赞状态");
  const result = await transaction(async () => {
    const project = await approvedProject(req);
    if (req.body.voted) await query("INSERT INTO project_votes (project_id, user_id) VALUES (?, ?) ON CONFLICT(project_id, user_id) DO NOTHING", [project.id, req.user!.userId]);
    else await query("DELETE FROM project_votes WHERE project_id = ? AND user_id = ?", [project.id, req.user!.userId]);
    const [count] = await query<any[]>("SELECT COUNT(*) AS count FROM project_votes WHERE project_id = ?", [project.id]);
    await query("UPDATE projects SET votes_count = ? WHERE id = ?", [Number(count.count), project.id]);
    return { voted: req.body.voted, votes_count: Number(count.count) };
  });
  res.json(result);
}));

projectsRouter.get("/:id/comments", optionalAuth, asyncRoute(async (req, res) => {
  const project = await visibleProject(req);
  if (project.is_deleted && !req.user?.isAdmin && project.user_id !== req.user?.userId) throw new HttpError(404, "作品已下架");
  res.json(await query(`SELECT c.id, c.user_id, c.content, c.created_at, u.username, u.avatar_url,
    COALESCE(u.contribution_points, 0) AS contribution_points FROM project_comments c LEFT JOIN users u ON u.id = c.user_id
    WHERE c.project_id = ? AND c.is_deleted = 0 ORDER BY c.created_at ASC, c.id ASC`, [project.id]));
}));

projectsRouter.post("/:id/comments", authMiddleware, rateLimit(10), asyncRoute(async (req, res) => {
  const content = text(req.body.content, 1000, true);
  await transaction(async () => {
    const project = await approvedProject(req);
    const duplicate = await query<any[]>("SELECT id FROM project_comments WHERE project_id = ? AND user_id = ? AND content = ? AND is_deleted = 0", [project.id, req.user!.userId, content]);
    if (duplicate.length) throw new HttpError(409, "已经发表过这条评论");
    await query("INSERT INTO project_comments (project_id, user_id, content) VALUES (?, ?, ?)", [project.id, req.user!.userId, content]);
    await query("UPDATE projects SET comments_count = comments_count + 1 WHERE id = ?", [project.id]);
  });
  res.status(201).json({ success: true });
}));

projectsRouter.delete("/:id/comments/:commentId", authMiddleware, asyncRoute(async (req, res) => {
  await transaction(async () => {
    const project = await visibleProject(req, true);
    const result = await query("UPDATE project_comments SET is_deleted = 1 WHERE id = ? AND project_id = ? AND user_id = ? AND is_deleted = 0", [positiveInt(req.params.commentId), project.id, req.user!.userId]);
    if (result.affectedRows) await query("UPDATE projects SET comments_count = CASE WHEN comments_count > 0 THEN comments_count - 1 ELSE 0 END WHERE id = ?", [project.id]);
  });
  res.json({ success: true });
}));

projectsRouter.post("/:id/report", authMiddleware, rateLimit(5), asyncRoute(async (req, res) => {
  const reason = text(req.body.reason, 80, true);
  const detail = text(req.body.detail, 1000);
  await transaction(async () => {
    const project = await approvedProject(req);
    const existing = await query<any[]>("SELECT id FROM project_reports WHERE project_id = ? AND user_id = ? AND status = 'open'", [project.id, req.user!.userId]);
    if (existing.length) throw new HttpError(409, "举报正在处理中，可在个人中心查看进度");
    await query("INSERT INTO project_reports (project_id, user_id, reason, detail) VALUES (?, ?, ?, ?)", [project.id, req.user!.userId, reason, detail]);
  });
  res.status(201).json({ success: true });
}));
