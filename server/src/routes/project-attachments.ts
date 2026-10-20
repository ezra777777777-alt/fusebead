import { Router } from "express";
import { randomUUID } from "crypto";
import { mkdir, readFile, realpath, unlink, writeFile } from "fs/promises";
import path from "path";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { query, transaction } from "../config/db";
import { asyncRoute, HttpError, positiveInt } from "../utils/http";
import { ImageRejected, MAX_ATTACHMENTS, sanitizeImage } from "../utils/image-bytes";

export const projectAttachmentsRouter = Router();
const storedNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export function attachmentRoot() {
  const base = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.resolve("data");
  return path.resolve(base, "attachments");
}

export function resolveStoredAttachment(storedName: string): string | null {
  if (typeof storedName !== "string" || storedName !== path.basename(storedName) || !storedNamePattern.test(storedName)) return null;
  const root = attachmentRoot();
  const filePath = path.resolve(root, storedName);
  if (path.dirname(filePath) !== root) return null;
  return filePath;
}

function present(row: { id: number; project_id: number; mime: string; byte_size: number; sort_order: number }) {
  const url = `/projects/${row.project_id}/attachments/${row.id}`;
  return { id: row.id, sortOrder: row.sort_order, mime: row.mime, byteSize: row.byte_size, url, thumbnailUrl: `${url}?variant=thumbnail` };
}

async function visibleProject(req: { params: { id?: string }; user?: { userId: number; isAdmin?: boolean } }, lock = false) {
  const id = positiveInt(req.params.id);
  const [project] = await query<any[]>(`SELECT * FROM projects WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
  const reader = req.user;
  if (!project || (project.is_deleted && !reader?.isAdmin && project.user_id !== reader?.userId) ||
    (project.status !== "approved" && project.user_id !== reader?.userId && !reader?.isAdmin)) {
    throw new HttpError(404, "作品不存在或尚未公开");
  }
  return project;
}

function assertEditor(project: { user_id: number; is_deleted: number; revision: number }, user: { userId: number; isAdmin?: boolean }, revision: unknown) {
  if (project.is_deleted) throw new HttpError(409, "作品已被管理员下架，不能修改图片");
  if (project.user_id !== user.userId && !user.isAdmin) throw new HttpError(403, "只有作者或管理员可以修改图片");
  if (positiveInt(revision) !== Number(project.revision)) throw new HttpError(409, "作品已更新，请刷新后再修改");
}

async function touchProject(project: { id: number; user_id: number }, userId: number, sendBackToReview: boolean) {
  if (sendBackToReview && project.user_id === userId) {
    await query("UPDATE projects SET status = 'pending', moderation_note = '', is_featured = 0, revision = revision + 1, updated_at = datetime('now') WHERE id = ?", [project.id]);
    return;
  }
  await query("UPDATE projects SET revision = revision + 1, updated_at = datetime('now') WHERE id = ?", [project.id]);
}

async function projectState(id: number) {
  const [project] = await query<any[]>("SELECT revision, status FROM projects WHERE id = ?", [id]);
  return { revision: Number(project.revision), status: project.status };
}

async function listAttachments(projectId: number) {
  return query<any[]>("SELECT id, project_id, mime, byte_size, sort_order FROM project_attachments WHERE project_id = ? ORDER BY sort_order ASC, id ASC", [projectId]);
}

function imageBuffer(body: { image?: unknown }) {
  const image = body?.image;
  if (typeof image !== "string" || !image || image.length > 2_900_000) {
    throw new HttpError(400, typeof image === "string" && image.length > 2_900_000 ? "单张图片不能超过 2 MB" : "请上传 PNG、JPEG 或 WebP 图片");
  }
  const payload = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) throw new HttpError(400, "请上传 PNG、JPEG 或 WebP 图片");
  return Buffer.from(payload, "base64");
}

async function removeStored(storedName: string) {
  const filePath = resolveStoredAttachment(storedName);
  if (!filePath) return;
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
}

projectAttachmentsRouter.get("/:id/attachments", authMiddleware, asyncRoute(async (req, res) => {
  const project = await visibleProject(req);
  const rows = await listAttachments(project.id);
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ attachments: rows.map(present), revision: Number(project.revision), status: project.status, limit: MAX_ATTACHMENTS });
}));

projectAttachmentsRouter.post("/:id/attachments", authMiddleware, rateLimit(30), rateLimit(200, 24 * 60 * 60 * 1000), asyncRoute(async (req, res) => {
  let sanitized;
  try { sanitized = sanitizeImage(imageBuffer(req.body || {})); }
  catch (error) { if (error instanceof ImageRejected) throw new HttpError(400, error.message); throw error; }
  const filename = `${randomUUID()}.${sanitized.extension}`;
  const filePath = resolveStoredAttachment(filename);
  if (!filePath) throw new HttpError(500, "服务暂时不可用，请稍后重试");
  let wrote = false;
  try {
    const created = await transaction(async () => {
      const project = await visibleProject(req, true);
      assertEditor(project, req.user!, req.body?.revision);
      const [count] = await query<any[]>("SELECT COUNT(*) AS total FROM project_attachments WHERE project_id = ?", [project.id]);
      if (Number(count.total) >= MAX_ATTACHMENTS) throw new HttpError(400, `每篇帖子最多 ${MAX_ATTACHMENTS} 张图片`);
      const [order] = await query<any[]>("SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM project_attachments WHERE project_id = ?", [project.id]);
      await mkdir(attachmentRoot(), { recursive: true });
      await writeFile(filePath, sanitized.bytes, { mode: 0o600, flag: "wx" });
      wrote = true;
      const inserted = await query("INSERT INTO project_attachments (project_id, stored_name, mime, byte_size, sort_order) VALUES (?, ?, ?, ?, ?)", [project.id, filename, sanitized.mime, sanitized.bytes.length, Number(order.max_order) + 1]);
      await touchProject(project, req.user!.userId, true);
      return { id: inserted.insertId, projectId: project.id };
    });
    const [row] = await query<any[]>("SELECT id, project_id, mime, byte_size, sort_order FROM project_attachments WHERE id = ?", [created.id]);
    res.status(201).json({ attachment: present(row), ...(await projectState(created.projectId)) });
  } catch (error) {
    if (wrote) await unlink(filePath).catch(() => {});
    throw error;
  }
}));

projectAttachmentsRouter.put("/:id/attachments/order", authMiddleware, asyncRoute(async (req, res) => {
  await transaction(async () => {
    const project = await visibleProject(req, true);
    assertEditor(project, req.user!, req.body?.revision);
    const rows = await query<any[]>("SELECT id FROM project_attachments WHERE project_id = ? ORDER BY sort_order ASC, id ASC", [project.id]);
    const current = rows.map((row) => Number(row.id));
    if (!Array.isArray(req.body?.ids) || req.body.ids.length !== current.length) throw new HttpError(400, "请提交完整的图片顺序");
    const requested = req.body.ids.map((id: unknown) => positiveInt(id));
    const same = requested.length === current.length && requested.every((id: number) => current.includes(id)) && new Set(requested).size === requested.length;
    if (!same) throw new HttpError(400, "请提交完整的图片顺序");
    for (let index = 0; index < requested.length; index++) {
      await query("UPDATE project_attachments SET sort_order = ? WHERE id = ? AND project_id = ?", [index, requested[index], project.id]);
    }
    await touchProject(project, req.user!.userId, false);
  });
  const project = await visibleProject(req);
  res.json({ attachments: (await listAttachments(project.id)).map(present), ...(await projectState(project.id)) });
}));

projectAttachmentsRouter.delete("/:id/attachments/:attachmentId", authMiddleware, asyncRoute(async (req, res) => {
  const attachmentId = positiveInt(req.params.attachmentId);
  let storedName = "";
  await transaction(async () => {
    const project = await visibleProject(req, true);
    assertEditor(project, req.user!, req.body?.revision);
    const [row] = await query<any[]>("SELECT stored_name FROM project_attachments WHERE id = ? AND project_id = ?", [attachmentId, project.id]);
    if (!row) throw new HttpError(404, "图片不存在");
    storedName = row.stored_name;
    await query("DELETE FROM project_attachments WHERE id = ? AND project_id = ?", [attachmentId, project.id]);
    await touchProject(project, req.user!.userId, true);
  });
  await removeStored(storedName);
  const project = await visibleProject(req);
  res.json({ success: true, ...(await projectState(project.id)) });
}));

projectAttachmentsRouter.get("/:id/attachments/:attachmentId", authMiddleware, asyncRoute(async (req, res) => {
  if (req.query.variant !== undefined && req.query.variant !== "thumbnail") throw new HttpError(400, "图片不存在");
  const project = await visibleProject(req);
  const [row] = await query<any[]>("SELECT stored_name, mime FROM project_attachments WHERE id = ? AND project_id = ?", [positiveInt(req.params.attachmentId), project.id]);
  if (!row) throw new HttpError(404, "图片不存在");
  const filePath = resolveStoredAttachment(row.stored_name);
  if (!filePath) throw new HttpError(404, "图片不存在");
  let real = "";
  try { real = await realpath(filePath); } catch { throw new HttpError(404, "图片不存在"); }
  if (path.dirname(real) !== await realpath(attachmentRoot())) throw new HttpError(404, "图片不存在");
  const bytes = await readFile(real);
  const magicOk = (row.mime === "image/png" && isPng(bytes)) || (row.mime === "image/jpeg" && isJpeg(bytes)) || (row.mime === "image/webp" && isWebp(bytes));
  if (!magicOk) throw new HttpError(404, "图片不存在");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", "inline");
  res.type(row.mime);
  res.send(bytes);
}));

function isPng(bytes: Buffer) { return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); }
function isJpeg(bytes: Buffer) { return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
function isWebp(bytes: Buffer) { return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"; }
