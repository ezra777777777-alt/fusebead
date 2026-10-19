"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceRegistryRouter = void 0;
exports.guardWebsiteRegistry = guardWebsiteRegistry;
exports.checkResource = checkResource;
exports.checkWebsiteResource = checkWebsiteResource;
exports.releaseWebsiteResource = releaseWebsiteResource;
exports.markWebsiteResourcePublished = markWebsiteResourcePublished;
const crypto_1 = require("crypto");
const express_1 = require("express");
const db_1 = require("../config/db");
const rateLimit_1 = require("../middleware/rateLimit");
const http_1 = require("../utils/http");
exports.resourceRegistryRouter = (0, express_1.Router)();
function digest(value) { return (0, crypto_1.createHash)("sha256").update(value).digest("hex"); }
function requestData(body) {
    if (!body || typeof body !== "object" || Array.isArray(body))
        throw new http_1.HttpError(400, "查重请求无效");
    const { requestId, project, channel, url, urls, content } = body;
    if (typeof requestId !== "string" || !requestId.trim() || requestId.length > 200 ||
        typeof project !== "string" || !/^PRJ-\d{4,}$/.test(project) ||
        typeof channel !== "string" || !channel.trim() || channel.length > 200 ||
        (url != null && (typeof url !== "string" || url.length > 2000)) ||
        (urls != null && (!Array.isArray(urls) || urls.length < 1 || urls.length > 2 || urls.some(value => typeof value !== "string" || !value || value.length > 2000) || url != null)) ||
        (content != null && (typeof content !== "string" || content.length > 100000)))
        throw new http_1.HttpError(400, "查重请求无效");
    const normalizedUrls = urls || (url ? [url] : []);
    const urlAliases = normalizedUrls.map(value => {
        try {
            const parsed = new URL(value);
            if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password)
                throw new Error();
            if (!/^#!?\//.test(parsed.hash))
                parsed.hash = "";
            for (const key of [...parsed.searchParams.keys()])
                if (/^utm_/i.test(key))
                    parsed.searchParams.delete(key);
            if (parsed.hostname.toLowerCase() === "github.com" && /^\/[^/]+\/[^/]+\/?$/.test(parsed.pathname)) {
                parsed.protocol = "https:";
                parsed.pathname = parsed.pathname.replace(/\/$/, "").replace(/\.git$/i, "").toLowerCase();
                parsed.search = "";
                parsed.hash = "";
            }
            parsed.searchParams.sort();
            return `url:${digest(parsed.toString())}`;
        }
        catch {
            throw new http_1.HttpError(400, "来源链接无效");
        }
    });
    const normalizedContent = typeof content === "string" ? content.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase() : "";
    const aliases = [...new Set([...urlAliases, normalizedContent.length >= 30 ? `content:${digest(normalizedContent)}` : ""].filter(Boolean))].sort();
    if (!aliases.length)
        throw new http_1.HttpError(400, "需要来源链接或至少 30 字的完整内容");
    const fingerprint = digest(JSON.stringify([aliases, project, channel.trim()]));
    return { requestId, project, channel: channel.trim(), aliases, fingerprint };
}
async function matchingEntries(aliases) {
    return (0, db_1.query)(`SELECT DISTINCT e.id, e.project, e.channel FROM resource_entries e
    JOIN resource_aliases a ON a.entry_id = e.id WHERE a.alias IN (${aliases.map(() => "?").join(", ")})`, aliases);
}
async function bindAliases(aliases, id) {
    for (const alias of aliases) {
        await (0, db_1.query)("INSERT INTO resource_aliases (alias, entry_id) VALUES (?, ?) ON CONFLICT(alias) DO NOTHING", [alias, id]);
        const [owner] = await (0, db_1.query)("SELECT entry_id FROM resource_aliases WHERE alias = ?", [alias]);
        if (!owner || Number(owner.entry_id) !== Number(id))
            throw new http_1.HttpError(409, "并发查重发生冲突，请使用相同请求编号重试");
    }
}
async function guardWebsiteRegistry() {
    await (0, db_1.lockResourceRegistry)();
    const [ready] = await (0, db_1.query)("SELECT setting_value FROM system_settings WHERE setting_key = ?", ["resource_registry_ready"]);
    const project = process.env.RESOURCE_REGISTRY_SITE_PROJECT;
    if (!ready && !project)
        return;
    const secret = process.env.RESOURCE_REGISTRY_KEY;
    const expected = JSON.stringify([project, process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站"]);
    if (!ready || ready.setting_value !== expected || !project || !/^PRJ-\d{4,}$/.test(project) || !secret || Buffer.byteLength(secret) < 32 || process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE !== "yes")
        throw new http_1.HttpError(503, "网站查重尚未准备完成，请稍后重试");
}
async function checkResource(body) {
    const data = requestData(body);
    return (0, db_1.transaction)(async () => {
        await (0, db_1.lockResourceRegistry)();
        const claim = await (0, db_1.query)("INSERT INTO resource_requests (request_id, fingerprint) VALUES (?, ?) ON CONFLICT(request_id) DO NOTHING", [data.requestId, data.fingerprint]);
        if (!claim.affectedRows) {
            const [prior] = await (0, db_1.query)("SELECT fingerprint, result FROM resource_requests WHERE request_id = ?", [data.requestId]);
            if (!prior || prior.fingerprint !== data.fingerprint || !prior.result)
                throw new http_1.HttpError(409, "查重请求编号已用于其他内容或尚未完成");
            const result = JSON.parse(prior.result);
            if (!result.duplicate) {
                const [entry] = await (0, db_1.query)("SELECT is_released FROM resource_entries WHERE id = ? FOR UPDATE", [result.id]);
                if (!entry || entry.is_released)
                    throw new http_1.HttpError(409, "原登记已释放，请使用新的查重请求编号");
                for (const alias of data.aliases) {
                    const [owner] = await (0, db_1.query)("SELECT entry_id FROM resource_aliases WHERE alias = ?", [alias]);
                    if (!owner || Number(owner.entry_id) !== Number(result.id))
                        throw new http_1.HttpError(409, "原登记已变化，请使用新的查重请求编号");
                }
            }
            return result;
        }
        const matches = await matchingEntries(data.aliases);
        if (matches.length > 1)
            throw new http_1.HttpError(409, "链接与内容分别匹配不同记录，请人工核对");
        const existing = matches[0];
        if (existing) {
            const [locked] = await (0, db_1.query)("SELECT is_released FROM resource_entries WHERE id = ? FOR UPDATE", [existing.id]);
            if (!locked || locked.is_released)
                throw new http_1.HttpError(409, "登记状态已变化，请使用相同请求编号重试");
        }
        const id = existing?.id || (await (0, db_1.query)("INSERT INTO resource_entries (project, channel) VALUES (?, ?)", [data.project, data.channel])).insertId;
        await bindAliases(data.aliases, id);
        const result = existing ? { duplicate: true, existing } : { duplicate: false, id: Number(id) };
        await (0, db_1.query)("UPDATE resource_requests SET result = ? WHERE request_id = ?", [JSON.stringify(result), data.requestId]);
        return result;
    });
}
// Must be called inside the same transaction as the website project write.
async function checkWebsiteResource(id, revision, urls) {
    const project = process.env.RESOURCE_REGISTRY_SITE_PROJECT;
    if (!project)
        return;
    const secret = process.env.RESOURCE_REGISTRY_KEY;
    if (!/^PRJ-\d{4,}$/.test(project) || !secret || Buffer.byteLength(secret) < 32 || process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE !== "yes")
        throw new http_1.HttpError(503, "网站查重尚未准备完成，请稍后重试");
    const channel = process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站";
    const data = requestData({ requestId: `website:${id}:${revision}`, project, channel, urls });
    const matches = await matchingEntries(data.aliases);
    if (matches.length > 1)
        throw new http_1.HttpError(409, "作品来源分别匹配不同记录，请人工核对");
    if (matches.length) {
        const [entry] = await (0, db_1.query)("SELECT * FROM resource_entries WHERE id = ? FOR UPDATE", [matches[0].id]);
        if (!entry || entry.is_released)
            throw new http_1.HttpError(409, "登记状态已变化，请重试");
        if (Number(entry.website_project_id) === id) {
            await bindAliases(data.aliases, entry.id);
            return;
        }
        throw new http_1.HttpError(409, "该来源已被收录或登记，不能重复投稿");
    }
    const result = await checkResource({ requestId: data.requestId, project, channel, urls });
    if (result.duplicate)
        throw new http_1.HttpError(409, "该来源已被收录或登记，不能重复投稿");
    const bound = await (0, db_1.query)("UPDATE resource_entries SET website_project_id = ?, website_owned = 1 WHERE id = ? AND website_project_id IS NULL", [id, result.id]);
    if (bound.affectedRows !== 1)
        throw new http_1.HttpError(409, "该查重登记已被其他投稿使用");
}
function websiteAlias(url) {
    return requestData({ requestId: "website:lookup", project: "PRJ-0000", channel: "网站", url }).aliases[0];
}
async function releaseWebsiteResource(id, urls, reason, nextUrls = []) {
    if (!process.env.RESOURCE_REGISTRY_SITE_PROJECT)
        return;
    const oldAliases = [...new Set(urls.filter(Boolean).map(websiteAlias))].sort();
    if (!oldAliases.length)
        return;
    const nextAliases = new Set(nextUrls.filter(Boolean).map(websiteAlias));
    const entries = (await matchingEntries(oldAliases)).sort((a, b) => Number(a.id) - Number(b.id));
    for (const found of entries) {
        const [entry] = await (0, db_1.query)("SELECT * FROM resource_entries WHERE id = ? FOR UPDATE", [found.id]);
        if (!entry || Number(entry.website_project_id) !== id || !entry.website_owned || entry.ever_published || entry.is_released)
            continue;
        const [imported] = await (0, db_1.query)("SELECT id FROM resource_imports WHERE entry_id = ?", [entry.id]);
        if (imported)
            continue;
        const aliases = await (0, db_1.query)("SELECT alias FROM resource_aliases WHERE entry_id = ?", [entry.id]);
        const retained = aliases.some(item => nextAliases.has(item.alias));
        const obsolete = oldAliases.filter(alias => !nextAliases.has(alias) && aliases.some(item => item.alias === alias));
        if (!obsolete.length)
            continue;
        if (retained) {
            for (const alias of obsolete)
                await (0, db_1.query)("DELETE FROM resource_aliases WHERE entry_id = ? AND alias = ?", [entry.id, alias]);
        }
        else {
            await (0, db_1.query)("UPDATE resource_entries SET is_released = 1 WHERE id = ?", [entry.id]);
            await (0, db_1.query)("DELETE FROM resource_aliases WHERE entry_id = ?", [entry.id]);
        }
        await (0, db_1.query)("INSERT INTO resource_events (entry_id, website_project_id, action) VALUES (?, ?, ?)", [entry.id, id, reason]);
    }
}
async function markWebsiteResourcePublished(id, urls) {
    if (!process.env.RESOURCE_REGISTRY_SITE_PROJECT)
        return;
    const aliases = [...new Set(urls.filter(Boolean).map(websiteAlias))].sort();
    if (!aliases.length)
        throw new http_1.HttpError(409, "查重登记缺少来源，请重新核对");
    const entries = await matchingEntries(aliases);
    if (entries.length !== 1)
        throw new http_1.HttpError(409, "查重登记不存在或来源冲突，请重新核对");
    const found = entries[0];
    for (const alias of aliases) {
        const [owner] = await (0, db_1.query)("SELECT entry_id FROM resource_aliases WHERE alias = ?", [alias]);
        if (!owner || Number(owner.entry_id) !== Number(found.id))
            throw new http_1.HttpError(409, "查重登记与作品不匹配，请重新核对");
    }
    const result = await (0, db_1.query)("UPDATE resource_entries SET ever_published = 1 WHERE id = ? AND website_project_id = ? AND is_released = 0", [found.id, id]);
    if (result.affectedRows !== 1)
        throw new http_1.HttpError(409, "查重登记与作品不匹配，请重新核对");
}
exports.resourceRegistryRouter.post("/check", (0, rateLimit_1.rateLimit)(120), (0, http_1.asyncRoute)(async (req, res) => {
    const secret = process.env.RESOURCE_REGISTRY_KEY;
    if (!secret || Buffer.byteLength(secret) < 32)
        throw new http_1.HttpError(503, "共享查重服务尚未配置");
    const supplied = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] || "";
    const expected = (0, crypto_1.createHash)("sha256").update(secret).digest();
    const actual = (0, crypto_1.createHash)("sha256").update(supplied).digest();
    if (!(0, crypto_1.timingSafeEqual)(actual, expected))
        throw new http_1.HttpError(401, "查重服务认证失败");
    if (typeof req.body?.requestId === "string" && req.body.requestId.startsWith("website:"))
        throw new http_1.HttpError(400, "请求编号使用了保留前缀");
    if (req.body?.preview != null && typeof req.body.preview !== "boolean")
        throw new http_1.HttpError(400, "查重模式无效");
    if (req.body?.reserveWebsite != null && typeof req.body.reserveWebsite !== "boolean")
        throw new http_1.HttpError(400, "查重模式无效");
    const isWebsite = !!process.env.RESOURCE_REGISTRY_SITE_PROJECT && req.body?.project === process.env.RESOURCE_REGISTRY_SITE_PROJECT && typeof req.body.channel === "string" && req.body.channel.trim() === (process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站");
    if (isWebsite && process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE !== "yes")
        throw new http_1.HttpError(503, "网站查重尚未准备完成，请稍后重试");
    if (req.body?.reserveWebsite === true)
        throw new http_1.HttpError(409, "网站不支持预登记，请预查后直接投稿");
    if (isWebsite && req.body?.preview !== true)
        throw new http_1.HttpError(409, "网站请求只能预查，投稿时会登记");
    if (req.body?.preview === true) {
        const project = process.env.RESOURCE_REGISTRY_SITE_PROJECT;
        const channel = process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站";
        if (!project || !/^PRJ-\d{4,}$/.test(project) || process.env.RESOURCE_REGISTRY_BACKFILL_COMPLETE !== "yes")
            throw new http_1.HttpError(503, "网站查重尚未准备完成，请稍后重试");
        if (req.body.project !== project || req.body.channel !== channel || !req.body.url)
            throw new http_1.HttpError(400, "预查仅适用于网站投稿来源链接");
        const data = requestData(req.body);
        const matches = await (0, db_1.transaction)(async () => { await guardWebsiteRegistry(); return matchingEntries(data.aliases); });
        if (matches.length > 1)
            throw new http_1.HttpError(409, "链接与内容分别匹配不同记录，请人工核对");
        res.json(matches[0] ? { duplicate: true, preview: true, existing: matches[0] } : { duplicate: false, preview: true });
        return;
    }
    const result = await checkResource(req.body);
    res.json(result);
}));
