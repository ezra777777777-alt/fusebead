import { createHash } from "crypto";
import { query, transaction } from "./config/db";
import { checkResource } from "./routes/resource-registry";

type LegacyEntry = { sourceId: string; project: string | null; channel: string; aliases: string[] };
type Counts = { website: number; legacy: number; merged: number };

export async function backfillResources(project: string, channel: string, legacy: LegacyEntry[], apply = false, siteAliases: string[] = []): Promise<Counts> {
  if (typeof project !== "string" || !/^PRJ-\d{4,}$/.test(project) || typeof channel !== "string" || !channel.trim() || channel.length > 200 || !Array.isArray(legacy) || legacy.length > 100000 || !Array.isArray(siteAliases) || siteAliases.length > 100 || siteAliases.some(alias => typeof alias !== "string" || !alias.trim() || alias.length > 200)) throw new Error("回填参数无效");
  channel = channel.trim();
  siteAliases = siteAliases.map(alias => alias.trim());
  for (const item of legacy) {
    if (!item || typeof item.sourceId !== "string" || !/^local-dedup:\d+$/.test(item.sourceId) ||
        (item.project !== null && (typeof item.project !== "string" || !/^PRJ-\d{4,}$/.test(item.project))) ||
        typeof item.channel !== "string" || !item.channel.trim() || item.channel.length > 200 ||
        !Array.isArray(item.aliases) || !item.aliases.length || item.aliases.length > 1000 ||
        item.aliases.some(alias => typeof alias !== "string" || !/^(url|content):[a-f0-9]{64}$/.test(alias)) ||
        new Set(item.aliases).size !== item.aliases.length) throw new Error("历史清单无效");
  }
  const dryRun = new Error("dry-run rollback");
  const counts: Counts = { website: 0, legacy: 0, merged: 0 };
  try {
    await transaction(async () => {
      const rows = await query<any[]>("SELECT id, repo_url, demo_url FROM projects WHERE status = 'approved' OR (status = 'pending' AND is_deleted = 0) ORDER BY id");
      for (const row of rows) {
        const result = await checkResource({ requestId: `website:backfill:${row.id}`, project, channel, urls: [row.repo_url, row.demo_url].filter(Boolean) });
        const entryId = result.duplicate ? result.existing.id : result.id;
        const [entry] = await query<any[]>("SELECT * FROM resource_entries WHERE id = ? FOR UPDATE", [entryId]);
        if (!entry || entry.project !== project || entry.channel !== channel || (entry.website_project_id != null && Number(entry.website_project_id) !== Number(row.id))) throw new Error(`网站历史来源冲突，作品编号 ${row.id}`);
        await query("UPDATE resource_entries SET website_project_id = ? WHERE id = ?", [row.id, entryId]);
        counts.website++;
      }
      for (const item of legacy) {
        const aliases = [...item.aliases].sort();
        const fingerprint = createHash("sha256").update(JSON.stringify([item.project, item.channel.trim(), aliases])).digest("hex");
        const [prior] = await query<any[]>("SELECT fingerprint FROM resource_imports WHERE source_id = ?", [item.sourceId]);
        if (prior) {
          if (prior.fingerprint !== fingerprint) throw new Error(`历史清单编号内容已改变：${item.sourceId}`);
          counts.legacy++;
          continue;
        }
        const ids = new Set<number>();
        for (const alias of aliases) {
          const [found] = await query<any[]>("SELECT entry_id FROM resource_aliases WHERE alias = ?", [alias]);
          if (found) ids.add(Number(found.entry_id));
        }
        if (ids.size > 1) throw new Error(`历史来源存在多条冲突记录：${item.sourceId}`);
        let entryId = [...ids][0];
        if (entryId) {
          const [entry] = await query<any[]>("SELECT * FROM resource_entries WHERE id = ? FOR UPDATE", [entryId]);
          const sameWebsite = entry?.website_project_id != null && entry.project === project && item.project === project && siteAliases.includes(item.channel.trim());
          if (!entry || (!sameWebsite && (entry.project !== (item.project || "未记录") || entry.channel !== item.channel.trim()))) throw new Error(`历史跨频道重复，请先核对：${item.sourceId}`);
          counts.merged++;
        } else {
          const inserted = await query<{ insertId: number }>("INSERT INTO resource_entries (project, channel) VALUES (?, ?)", [item.project || "未记录", item.channel.trim()]);
          entryId = inserted.insertId;
        }
        for (const alias of aliases) {
          await query("INSERT INTO resource_aliases (alias, entry_id) VALUES (?, ?) ON CONFLICT(alias) DO NOTHING", [alias, entryId]);
          const [owner] = await query<any[]>("SELECT entry_id FROM resource_aliases WHERE alias = ?", [alias]);
          if (!owner || Number(owner.entry_id) !== Number(entryId)) throw new Error(`历史别名并发冲突：${item.sourceId}`);
        }
        await query("INSERT INTO resource_imports (source_id, fingerprint, entry_id) VALUES (?, ?, ?)", [item.sourceId, fingerprint, entryId]);
        counts.legacy++;
      }
      if (!apply) throw dryRun;
    });
  } catch (error) { if (error !== dryRun) throw error; }
  return counts;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !["--dry-run", "--apply"].includes(args[0]))) {
    console.error("用法：node dist/resource-backfill.js [--dry-run|--apply]，从标准输入读取历史清单");
    process.exit(1);
  }
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => {
    input += chunk;
    if (input.length > 16_000_000) { console.error("历史清单过大"); process.exit(1); }
  });
  process.stdin.on("end", async () => {
    try {
      const aliases = JSON.parse(process.env.RESOURCE_REGISTRY_SITE_HISTORY_CHANNELS || "[]");
      const counts = await backfillResources(process.env.RESOURCE_REGISTRY_SITE_PROJECT || "", process.env.RESOURCE_REGISTRY_SITE_CHANNEL || "网站", JSON.parse(input), args[0] === "--apply", aliases);
      console.log(JSON.stringify({ mode: args[0] === "--apply" ? "applied" : "dry-run", ...counts }));
    } catch (error) { console.error("历史回填失败：" + (error instanceof Error ? error.message : "未知错误")); process.exitCode = 1; }
  });
}
