"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectAttachmentsRouter = void 0;
exports.attachmentRoot = attachmentRoot;
exports.resolveStoredAttachment = resolveStoredAttachment;
const express_1 = require("express");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const db_1 = require("../config/db");
const http_1 = require("../utils/http");
const image_bytes_1 = require("../utils/image-bytes");
exports.projectAttachmentsRouter = (0, express_1.Router)();
const storedNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
function attachmentRoot() {
    const base = process.env.DB_PATH ? path_1.default.dirname(process.env.DB_PATH) : path_1.default.resolve("data");
    return path_1.default.resolve(base, "attachments");
}
function resolveStoredAttachment(storedName) {
    if (typeof storedName !== "string" || storedName !== path_1.default.basename(storedName) || !storedNamePattern.test(storedName))
        return null;
    const root = attachmentRoot();
    const filePath = path_1.default.resolve(root, storedName);
    if (path_1.default.dirname(filePath) !== root)
        return null;
    return filePath;
}
function present(row) {
    const url = `/projects/${row.project_id}/attachments/${row.id}`;
    return { id: row.id, sortOrder: row.sort_order, mime: row.mime, byteSize: row.byte_size, url, thumbnailUrl: `${url}?variant=thumbnail` };
}
async function visibleProject(req, lock = false) {
    const id = (0, http_1.positiveInt)(req.params.id);
    const [project] = await (0, db_1.query)(`SELECT * FROM projects WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [id]);
    const reader = req.user;
    if (!project || (project.is_deleted && !reader?.isAdmin && project.user_id !== reader?.userId) ||
        (project.status !== "approved" && project.user_id !== reader?.userId && !reader?.isAdmin)) {
        throw new http_1.HttpError(404, "作品不存在或尚未公开");
    }
    return project;
}
function assertEditor(project, user, revision) {
    if (project.is_deleted)
        throw new http_1.HttpError(409, "作品已被管理员下架，不能修改图片");
    if (project.user_id !== user.userId && !user.isAdmin)
        throw new http_1.HttpError(403, "只有作者或管理员可以修改图片");
    if ((0, http_1.positiveInt)(revision) !== Number(project.revision))
        throw new http_1.HttpError(409, "作品已更新，请刷新后再修改");
}
async function touchProject(project, userId, sendBackToReview) {
    if (sendBackToReview && project.user_id === userId) {
        await (0, db_1.query)("UPDATE projects SET status = 'pending', moderation_note = '', is_featured = 0, revision = revision + 1, updated_at = datetime('now') WHERE id = ?", [project.id]);
        return;
    }
    await (0, db_1.query)("UPDATE projects SET revision = revision + 1, updated_at = datetime('now') WHERE id = ?", [project.id]);
}
async function projectState(id) {
    const [project] = await (0, db_1.query)("SELECT revision, status FROM projects WHERE id = ?", [id]);
    return { revision: Number(project.revision), status: project.status };
}
async function listAttachments(projectId) {
    return (0, db_1.query)("SELECT id, project_id, mime, byte_size, sort_order FROM project_attachments WHERE project_id = ? ORDER BY sort_order ASC, id ASC", [projectId]);
}
function imageBuffer(body) {
    const image = body?.image;
    if (typeof image !== "string" || !image || image.length > 2900000) {
        throw new http_1.HttpError(400, typeof image === "string" && image.length > 2900000 ? "单张图片不能超过 2 MB" : "请上传 PNG、JPEG 或 WebP 图片");
    }
    const payload = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload))
        throw new http_1.HttpError(400, "请上传 PNG、JPEG 或 WebP 图片");
    return Buffer.from(payload, "base64");
}
async function removeStored(storedName) {
    const filePath = resolveStoredAttachment(storedName);
    if (!filePath)
        return;
    await (0, promises_1.unlink)(filePath).catch((error) => { if (error.code !== "ENOENT")
        throw error; });
}
exports.projectAttachmentsRouter.get("/:id/attachments", auth_1.authMiddleware, (0, http_1.asyncRoute)(async (req, res) => {
    const project = await visibleProject(req);
    const rows = await listAttachments(project.id);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ attachments: rows.map(present), revision: Number(project.revision), status: project.status, limit: image_bytes_1.MAX_ATTACHMENTS });
}));
exports.projectAttachmentsRouter.post("/:id/attachments", auth_1.authMiddleware, (0, rateLimit_1.rateLimit)(30), (0, rateLimit_1.rateLimit)(200, 24 * 60 * 60 * 1000), (0, http_1.asyncRoute)(async (req, res) => {
    let sanitized;
    try {
        sanitized = (0, image_bytes_1.sanitizeImage)(imageBuffer(req.body || {}));
    }
    catch (error) {
        if (error instanceof image_bytes_1.ImageRejected)
            throw new http_1.HttpError(400, error.message);
        throw error;
    }
    const filename = `${(0, crypto_1.randomUUID)()}.${sanitized.extension}`;
    const filePath = resolveStoredAttachment(filename);
    if (!filePath)
        throw new http_1.HttpError(500, "服务暂时不可用，请稍后重试");
    let wrote = false;
    try {
        const created = await (0, db_1.transaction)(async () => {
            const project = await visibleProject(req, true);
            assertEditor(project, req.user, req.body?.revision);
            const [count] = await (0, db_1.query)("SELECT COUNT(*) AS total FROM project_attachments WHERE project_id = ?", [project.id]);
            if (Number(count.total) >= image_bytes_1.MAX_ATTACHMENTS)
                throw new http_1.HttpError(400, `每篇帖子最多 ${image_bytes_1.MAX_ATTACHMENTS} 张图片`);
            const [order] = await (0, db_1.query)("SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM project_attachments WHERE project_id = ?", [project.id]);
            await (0, promises_1.mkdir)(attachmentRoot(), { recursive: true });
            await (0, promises_1.writeFile)(filePath, sanitized.bytes, { mode: 0o600, flag: "wx" });
            wrote = true;
            const inserted = await (0, db_1.query)("INSERT INTO project_attachments (project_id, stored_name, mime, byte_size, sort_order) VALUES (?, ?, ?, ?, ?)", [project.id, filename, sanitized.mime, sanitized.bytes.length, Number(order.max_order) + 1]);
            await touchProject(project, req.user.userId, true);
            return { id: inserted.insertId, projectId: project.id };
        });
        const [row] = await (0, db_1.query)("SELECT id, project_id, mime, byte_size, sort_order FROM project_attachments WHERE id = ?", [created.id]);
        res.status(201).json({ attachment: present(row), ...(await projectState(created.projectId)) });
    }
    catch (error) {
        if (wrote)
            await (0, promises_1.unlink)(filePath).catch(() => { });
        throw error;
    }
}));
exports.projectAttachmentsRouter.put("/:id/attachments/order", auth_1.authMiddleware, (0, http_1.asyncRoute)(async (req, res) => {
    await (0, db_1.transaction)(async () => {
        const project = await visibleProject(req, true);
        assertEditor(project, req.user, req.body?.revision);
        const rows = await (0, db_1.query)("SELECT id FROM project_attachments WHERE project_id = ? ORDER BY sort_order ASC, id ASC", [project.id]);
        const current = rows.map((row) => Number(row.id));
        if (!Array.isArray(req.body?.ids) || req.body.ids.length !== current.length)
            throw new http_1.HttpError(400, "请提交完整的图片顺序");
        const requested = req.body.ids.map((id) => (0, http_1.positiveInt)(id));
        const same = requested.length === current.length && requested.every((id) => current.includes(id)) && new Set(requested).size === requested.length;
        if (!same)
            throw new http_1.HttpError(400, "请提交完整的图片顺序");
        for (let index = 0; index < requested.length; index++) {
            await (0, db_1.query)("UPDATE project_attachments SET sort_order = ? WHERE id = ? AND project_id = ?", [index, requested[index], project.id]);
        }
        await touchProject(project, req.user.userId, false);
    });
    const project = await visibleProject(req);
    res.json({ attachments: (await listAttachments(project.id)).map(present), ...(await projectState(project.id)) });
}));
exports.projectAttachmentsRouter.delete("/:id/attachments/:attachmentId", auth_1.authMiddleware, (0, http_1.asyncRoute)(async (req, res) => {
    const attachmentId = (0, http_1.positiveInt)(req.params.attachmentId);
    let storedName = "";
    await (0, db_1.transaction)(async () => {
        const project = await visibleProject(req, true);
        assertEditor(project, req.user, req.body?.revision);
        const [row] = await (0, db_1.query)("SELECT stored_name FROM project_attachments WHERE id = ? AND project_id = ?", [attachmentId, project.id]);
        if (!row)
            throw new http_1.HttpError(404, "图片不存在");
        storedName = row.stored_name;
        await (0, db_1.query)("DELETE FROM project_attachments WHERE id = ? AND project_id = ?", [attachmentId, project.id]);
        await touchProject(project, req.user.userId, true);
    });
    await removeStored(storedName);
    const project = await visibleProject(req);
    res.json({ success: true, ...(await projectState(project.id)) });
}));
exports.projectAttachmentsRouter.get("/:id/attachments/:attachmentId", auth_1.authMiddleware, (0, http_1.asyncRoute)(async (req, res) => {
    if (req.query.variant !== undefined && req.query.variant !== "thumbnail")
        throw new http_1.HttpError(400, "图片不存在");
    const project = await visibleProject(req);
    const [row] = await (0, db_1.query)("SELECT stored_name, mime FROM project_attachments WHERE id = ? AND project_id = ?", [(0, http_1.positiveInt)(req.params.attachmentId), project.id]);
    if (!row)
        throw new http_1.HttpError(404, "图片不存在");
    const filePath = resolveStoredAttachment(row.stored_name);
    if (!filePath)
        throw new http_1.HttpError(404, "图片不存在");
    let real = "";
    try {
        real = await (0, promises_1.realpath)(filePath);
    }
    catch {
        throw new http_1.HttpError(404, "图片不存在");
    }
    if (path_1.default.dirname(real) !== attachmentRoot())
        throw new http_1.HttpError(404, "图片不存在");
    const bytes = await (0, promises_1.readFile)(real);
    const magicOk = (row.mime === "image/png" && isPng(bytes)) || (row.mime === "image/jpeg" && isJpeg(bytes)) || (row.mime === "image/webp" && isWebp(bytes));
    if (!magicOk)
        throw new http_1.HttpError(404, "图片不存在");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", "inline");
    res.type(row.mime);
    res.send(bytes);
}));
function isPng(bytes) { return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); }
function isJpeg(bytes) { return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
function isWebp(bytes) { return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"; }
