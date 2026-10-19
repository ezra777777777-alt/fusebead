"use client";

import { categoryLabel, serverDate } from "@/lib/community";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, RotateCcw, Search, ShieldCheck, Star, Trash2, X } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";
import { api } from "@/lib/api";

const statuses = ["all", "pending", "approved", "rejected", "withdrawn", "deleted"];
const labels: Record<string, string> = { all: "全部", pending: "待质检", approved: "已放行", rejected: "已退回", withdrawn: "作者撤回", deleted: "已清除" };

export default function AdminProjectsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams({ status, search, limit: "20", page: String(page) });
    api(`/admin/projects?${params}`).then((data) => { setItems(data.projects); setTotal(data.total); }).catch((err) => setError(err.message || "加载失败"));
  }, [status, search, page]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: string) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await api(`/admin/projects/${id}`, { method: "PUT", body: JSON.stringify({ action, note: notes[id] || "", revision: items.find(item => item.id === id)?.revision }) });
      load();
    } catch (err: any) { setError(err.message || "操作失败"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 text-black">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--orange)]">CYBER SANITATION</div>
        <h1 className="mt-1 text-2xl font-black">污染物质检</h1>
        <p className="mt-1 text-sm font-semibold text-black/45">先确认链接安全、内容归属和介绍真实性，再决定是否放行。</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {statuses.map((item) => <button key={item} onClick={() => { setStatus(item); setPage(1); }} className={`shrink-0 border-2 border-black px-3 py-2 text-xs font-black ${status === item ? "bg-black text-[var(--acid)]" : "bg-white"}`}>{labels[item]}</button>)}
        </div>
        <label className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2 sm:w-64"><Search className="h-4 w-4 text-black/30" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="搜索标题或作者" className="w-full bg-transparent text-sm font-bold outline-none" /></label>
      </div>

      {error && <div className="border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div>}
      {!items.length ? (
        <div className="border-2 border-dashed border-black/25 py-20 text-center text-sm font-bold text-black/35">当前分拣区空空如也</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[var(--orange)]">CN-404-{String(item.id).padStart(6, "0")} · {categoryLabel(item.category)}</div>
                  <h2 className="mt-1 text-lg font-black">{item.title}</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-black/50">{item.summary}</p>
                  <p className="mt-2 text-xs font-bold text-black/35">搬运工：{item.author_name} · {serverDate(item.created_at).toLocaleString("zh-CN")}</p>
                </div>
                <span className="shrink-0 border border-black bg-[var(--paper)] px-2 py-1 text-[10px] font-black">{item.is_deleted ? "已清除" : labels[item.status] || item.status}{item.is_featured ? " · 推荐" : ""}</span>
              </div>
              {item.moderation_note && <p className="mt-4 text-sm text-black/60">上次审核说明：{item.moderation_note}</p>}
              <label className="mt-4 block text-xs font-bold">审核说明（退回 / 下架必填）<textarea value={notes[item.id] || ""} onChange={e => setNotes(current => ({ ...current, [item.id]: e.target.value }))} maxLength={1000} rows={2} className="cyber-input mt-2" placeholder="具体说明需要修改的地方" /></label>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-black/15 pt-4">
                <a href={item.demo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 border border-black px-2.5 py-1.5 text-xs font-black"><ExternalLink className="h-3.5 w-3.5" />检查链接</a>
                {item.repo_url && item.repo_url !== item.demo_url && <a href={item.repo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 border border-black px-2.5 py-1.5 text-xs font-black"><ExternalLink className="h-3.5 w-3.5" />检查源码仓库</a>}
                <Link href={`/projects/${item.id}`} className="flex items-center gap-1 border border-black px-2.5 py-1.5 text-xs font-black"><ShieldCheck className="h-3.5 w-3.5" />查看档案</Link>
                {!item.is_deleted && item.status === "pending" && <button disabled={busy} onClick={() => act(item.id, "approve")} className="flex items-center gap-1 border border-black bg-[var(--acid)] px-2.5 py-1.5 text-xs font-black"><Check className="h-3.5 w-3.5" />放行</button>}
                {!item.is_deleted && item.status === "pending" && <button disabled={busy} onClick={() => act(item.id, "reject")} className="flex items-center gap-1 border border-black bg-yellow-100 px-2.5 py-1.5 text-xs font-black"><X className="h-3.5 w-3.5" />退回</button>}
                {!item.is_deleted && item.status === "approved" && <button disabled={busy} onClick={() => act(item.id, item.is_featured ? "unfeature" : "feature")} className="flex items-center gap-1 border border-black px-2.5 py-1.5 text-xs font-black"><Star className="h-3.5 w-3.5" />{item.is_featured ? "撤下推荐" : "设为重点"}</button>}
                {!item.is_deleted ? <button disabled={busy} onClick={() => act(item.id, "softDelete")} className="flex items-center gap-1 border border-black bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-600"><Trash2 className="h-3.5 w-3.5" />清除</button> : <button disabled={busy} onClick={() => act(item.id, "restore")} className="flex items-center gap-1 border border-black px-2.5 py-1.5 text-xs font-black"><RotateCcw className="h-3.5 w-3.5" />恢复质检</button>}
              </div>
            </article>
          ))}
        </div>
      )}
      {total > 20 && <Pagination page={page} totalPages={Math.ceil(total / 20)} onChange={setPage} />}
    </div>
  );
}
