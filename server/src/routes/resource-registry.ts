import { createHash, createHmac, timingSafeEqual } from "crypto";
import { Router } from "express";
import { query, transaction } from "../config/db";
import { rateLimit } from "../middleware/rateLimit";
import { asyncRoute, HttpError } from "../utils/http";

export const resourceRegistryRouter = Router();

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function claimToken(secret: string, requestId: string, id: number) {
  return createHmac("sha256", secret).update(JSON.stringify([requestId, Number(id)])).digest("hex");
}
function sameSecret(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

function requestData(body: Record<string, unknown>) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "查重请求无效");
  const { requestId, project, channel, url, content } = body;
  if (typeof requestId !== "string" || !requestId.trim() || requestId.length > 200 ||
      typeof project !== "string" || !/^PRJ-\d{4,}$/.test(project) ||
      typeof channel !== "string" || !channel.trim() || channel.length > 200 ||
      (url != null && (typeof url !== "string" || url.length > 2000)) ||
      (content != null && (typeof content !== "string" || content.length > 100000))) throw new HttpError(400, "查重请求无效");
  let normalizedUrl = "";
  if (url) {
    try {
      const parsed = new URL(url as string);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
      if (!/^#!?\//.test(parsed.hash)) parsed.hash = "";
      for (const key of [...parsed.searchParams.keys()]) if (/^utm_/i.test(key)) parsed.searchParams.delete(key);
      if (parsed.hostname.toLowerCase() === "github.com" && /^\/[^/]+\/[^/]+\/?$/.test(parsed.pathname)) {
        parsed.protocol = "https:";
        parsed.pathname = parsed.pathname.replace(/\/$/, "").replace(/\.git$/i, "").toLowerCase();
        parsed.search = "";
        parsed.hash = "";
      }
      parsed.searchParams.sort();
      normalizedUrl = parsed.toString();
    } catch { throw new HttpError(400, "来源链接无效"); }
  }
  const normalizedContent = typeof content === "string" ? content.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase() : "";
  const aliases = [normalizedUrl ? `url:${digest(normalizedUrl)}` : "", normalizedContent.length >= 30 ? `content:${digest(normalizedContent)}` : ""].filter(Boolean).sort();
  if (!aliases.length) throw new HttpError(400, "需要来源链接或至少 30 字的完整内容");
  const fingerprint = digest(JSON.stringify([aliases, project, channel.trim()]));
  return { requestId, project, channel: channel.trim(), aliases, fingerprint };
}

export async function checkResource(body: Record<string, unknown>) {
  const data = requestData(body);
  return transaction(async () => {
    const claim = await query<{ affectedRows: number }>("INSERT INTO resource_requests (request_id, fingerprint) VALUES (?, ?) ON CONFLICT(request_id) DO NOTHING", [data.requestId, data.fingerprint]);
    if (!claim.affectedRows) {
      const [prior] = await query<any[]>("SELECT fingerprint, result FROM resource_requests WHERE request_id = ?", [data.requestId]);
      if (!prior || prior.fingerprint !== data.fingerprint || !prior.result) throw new HttpError(409, "查重请求编号已用于其他内容或尚未完成");
      const result = JSON.parse(prior.result);
      if (!result.duplicate) {
        const [entry] = await query<any[]>("SELECT is_released FROM resource_entries WHERE id = ? FOR UPDATE", [result.id]);
        if (!entry || entry.is_released) throw new HttpError(409, "原登记已释放，请使用新的查重请求编号");
      }
      return result;
    }
    const matches = await query<any[]>(`SELECT DISTINCT e.id, e.project, e.channel FROM resource_entries e
      JOIN resource_aliases a ON a.entry_id = e.id WHERE a.alias = ? OR a.alias = ?`, [data.aliases[0], data.aliases[1] || data.aliases[0]]);
    if (matches.length > 1) throw new HttpError(409, "链接与内容分别匹配不同记录，请人工核对");
    const existing = matches[0];
    if (existing) {
      const [locked] = await query<any[]>("SELECT is_released FROM resource_entries WHERE id = ? FOR UPDATE", [existing.id]);
      if (!locked || locked.is_released) throw new HttpError(409, "登记状态已变化，请使用相同请求编号重试");
    }
    const id = existing?.id || (await query<{ insertId: number }>("INSERT INTO resource_entries (project, channel) VALUES (?, ?)", [data.project, data.channel])).insertId;
    for (const alias of data.aliases) {
      await query("INSERT INTO resource_aliases (alias, entry_id) VALUES (?, ?) ON CONFLICT(alias) DO NOTHING", [alias, id]);
      const [owner] = await query<any[]>("SELECT entry_id FROM resource_aliases WHERE alias = ?", [alias]);
      if (!owner || Number(owner.entry_id) !== Number(id)) throw new HttpError(409, "并发查重发生冲突，请使用相同请求编号重试");
    }
    const result = existing ? { duplicate: true, existing } : { duplicate: false, id: Number(id) };
    await query("UPDATE resource_requests SET result = ? WHERE request_id = ?", [JSON.stringify(result), data.requestId]);
    return result;
  });
}

// Must be called inside the same transaction as the website project write.
export async function checkWebsiteResource(id: number, revision: number, url: string, proof?: unknown) {
  const project = process.env.RESOURCE_REGISTRY_SITE_PROJECT;
  if (!project) return;
  const secret = process.env.RESOURCE_REGISTRY_KEY;
  if (!/^PRJ-\d{4,}$/.test(project) || !secret || Buffer.byteLength(secret) < 32 || process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE !== "yes") throw new HttpError(503, "网站查重尚未准备完成，请稍后重试");
  const channel = process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站";
  const data = requestData({ requestId: `website:${id}:${revision}`, project, channel, url });
  const [alias] = await query<any[]>("SELECT entry_id FROM resource_aliases WHERE alias = ?", [data.aliases[0]]);
  if (alias) {
    const [entry] = await query<any[]>("SELECT * FROM resource_entries WHERE id = ? FOR UPDATE", [alias.entry_id]);
    if (Number(entry?.website_project_id) === id) return;
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) throw new HttpError(409, "该来源已被收录或登记，不能重复投稿");
    const { requestId, token } = proof as Record<string, unknown>;
    if (typeof requestId !== "string" || typeof token !== "string" || requestId.length > 200 || token.length !== 64 ||
        !sameSecret(token, claimToken(secret, requestId, entry.id))) throw new HttpError(409, "查重登记凭证无效");
    const [request] = await query<any[]>("SELECT result FROM resource_requests WHERE request_id = ?", [requestId]);
    let result;
    try { result = JSON.parse(request?.result || "null"); } catch { result = null; }
    if (!result || result.duplicate !== false || Number(result.id) !== Number(entry.id) || entry.project !== project || entry.channel !== channel) throw new HttpError(409, "查重登记与网站投稿不匹配");
    const bound = await query<{ affectedRows: number }>("UPDATE resource_entries SET website_project_id = ? WHERE id = ? AND website_project_id IS NULL", [id, entry.id]);
    if (bound.affectedRows !== 1) throw new HttpError(409, "该查重登记已被其他投稿使用");
    return;
  }
  if (proof != null) throw new HttpError(409, "查重登记与网站投稿不匹配");
  const result = await checkResource({ requestId: data.requestId, project, channel, url });
  if (result.duplicate) throw new HttpError(409, "该来源已被收录或登记，不能重复投稿");
  const bound = await query<{ affectedRows: number }>("UPDATE resource_entries SET website_project_id = ?, website_owned = 1 WHERE id = ? AND website_project_id IS NULL", [id, result.id]);
  if (bound.affectedRows !== 1) throw new HttpError(409, "该查重登记已被其他投稿使用");
}

function websiteAlias(url: string) {
  return requestData({ requestId: "website:lookup", project: "PRJ-0000", channel: "网站", url }).aliases[0];
}

export async function releaseWebsiteResource(id: number, url: string, reason: "changed" | "withdrawn" | "rejected", nextUrl?: string) {
  if (!process.env.RESOURCE_REGISTRY_SITE_PROJECT) return;
  const alias = websiteAlias(url);
  if (nextUrl && websiteAlias(nextUrl) === alias) return;
  const [found] = await query<any[]>("SELECT entry_id FROM resource_aliases WHERE alias = ?", [alias]);
  if (!found) return;
  const [entry] = await query<any[]>("SELECT * FROM resource_entries WHERE id = ? FOR UPDATE", [found.entry_id]);
  if (!entry || Number(entry.website_project_id) !== id || !entry.website_owned || entry.ever_published || entry.is_released) return;
  const [imported] = await query<any[]>("SELECT id FROM resource_imports WHERE entry_id = ?", [entry.id]);
  if (imported) return;
  await query("UPDATE resource_entries SET is_released = 1 WHERE id = ?", [entry.id]);
  await query("DELETE FROM resource_aliases WHERE entry_id = ?", [entry.id]);
  await query("INSERT INTO resource_events (entry_id, website_project_id, action) VALUES (?, ?, ?)", [entry.id, id, reason]);
}

export async function markWebsiteResourcePublished(id: number, url: string) {
  if (!process.env.RESOURCE_REGISTRY_SITE_PROJECT) return;
  const [found] = await query<any[]>("SELECT entry_id FROM resource_aliases WHERE alias = ?", [websiteAlias(url)]);
  if (!found) throw new HttpError(409, "查重登记不存在，请重新核对");
  const result = await query<{ affectedRows: number }>("UPDATE resource_entries SET ever_published = 1 WHERE id = ? AND website_project_id = ? AND is_released = 0", [found.entry_id, id]);
  if (result.affectedRows !== 1) throw new HttpError(409, "查重登记与作品不匹配，请重新核对");
}

resourceRegistryRouter.post("/check", rateLimit(120), asyncRoute(async (req, res) => {
  const secret = process.env.RESOURCE_REGISTRY_KEY;
  if (!secret || Buffer.byteLength(secret) < 32) throw new HttpError(503, "共享查重服务尚未配置");
  const supplied = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] || "";
  const expected = createHash("sha256").update(secret).digest();
  const actual = createHash("sha256").update(supplied).digest();
  if (!timingSafeEqual(actual, expected)) throw new HttpError(401, "查重服务认证失败");
  if (typeof req.body?.requestId === "string" && req.body.requestId.startsWith("website:")) throw new HttpError(400, "请求编号使用了保留前缀");
  if (req.body?.preview != null && typeof req.body.preview !== "boolean") throw new HttpError(400, "查重模式无效");
  if (req.body?.reserveWebsite != null && typeof req.body.reserveWebsite !== "boolean") throw new HttpError(400, "查重模式无效");
  const isWebsite = !!process.env.RESOURCE_REGISTRY_SITE_PROJECT && req.body?.project === process.env.RESOURCE_REGISTRY_SITE_PROJECT && typeof req.body.channel === "string" && req.body.channel.trim() === (process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站");
  if (isWebsite && process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE !== "yes") throw new HttpError(503, "网站查重尚未准备完成，请稍后重试");
  if (isWebsite && req.body?.preview !== true && req.body?.reserveWebsite !== true) throw new HttpError(409, "网站请求需预查，或明确使用带凭证的预登记");
  if (req.body?.reserveWebsite === true && (!isWebsite || req.body?.preview === true)) throw new HttpError(400, "网站预登记模式无效");
  if (req.body?.preview === true) {
    const project = process.env.RESOURCE_REGISTRY_SITE_PROJECT;
    const channel = process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站";
    if (!project || !/^PRJ-\d{4,}$/.test(project) || process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE !== "yes") throw new HttpError(503, "网站查重尚未准备完成，请稍后重试");
    if (req.body.project !== project || req.body.channel !== channel || !req.body.url) throw new HttpError(400, "预查仅适用于网站投稿来源链接");
    const data = requestData(req.body);
    const matches = await query<any[]>(`SELECT DISTINCT e.id, e.project, e.channel FROM resource_entries e
      JOIN resource_aliases a ON a.entry_id = e.id WHERE a.alias = ? OR a.alias = ?`, [data.aliases[0], data.aliases[1] || data.aliases[0]]);
    if (matches.length > 1) throw new HttpError(409, "链接与内容分别匹配不同记录，请人工核对");
    res.json(matches[0] ? { duplicate: true, preview: true, existing: matches[0] } : { duplicate: false, preview: true });
    return;
  }
  const result = await checkResource(req.body);
  res.json(result.duplicate ? result : { ...result, claimToken: claimToken(secret, req.body.requestId, result.id) });
}));
