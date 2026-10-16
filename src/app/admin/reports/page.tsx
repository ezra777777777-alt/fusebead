"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Flag, RotateCcw } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";
import { api } from "@/lib/api";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const load = useCallback(() => api(`/admin/project-reports?page=${page}`).then(data => { setReports(data.reports); setTotal(data.total); }).catch(err => setError(err.message || "加载失败")), [page]);
  useEffect(() => { load(); }, [load]);
  const setStatus = async (id: number, status: "open" | "resolved") => {
    if (busy) return;
    setBusy(true); setError("");
    try { await api(`/admin/project-reports/${id}`, { method: "PUT", body: JSON.stringify({ status, note: notes[id] || "" }) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "处理失败"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 text-black">
      <div><div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">SANITATION HOTLINE</div><h1 className="mt-1 text-2xl font-black">环卫举报</h1><p className="mt-1 text-sm font-semibold text-black/45">用户发现危险链接、侵权或真垃圾后，会在这里呼叫环卫。</p></div>
      {error && <div className="border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div>}
      {!reports.length ? <div className="border-2 border-dashed border-black/25 py-20 text-center text-sm font-bold text-black/35">今天没人呼叫环卫</div> : (
        <div className="space-y-3">
          {reports.map((report) => <article key={report.id} className={`border-2 border-black p-5 shadow-[4px_4px_0_#000] ${report.status === "open" ? "bg-white" : "bg-[var(--paper)] opacity-65"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-black text-red-600"><Flag className="h-4 w-4" />{report.reason}</div><h2 className="mt-1 text-lg font-black">{report.project_title || "已不存在的污染物"}</h2><p className="mt-1 text-xs font-bold text-black/40">举报人：{report.reporter_name} · {new Date(report.created_at).toLocaleString("zh-CN")}</p>{report.detail && <p className="mt-3 text-sm font-semibold text-black/60">{report.detail}</p>}</div><div className="flex shrink-0 gap-2"><Link href={`/projects/${report.project_id}`} className="border border-black px-3 py-2 text-xs font-black">查看档案</Link>{report.status === "open" ? <button disabled={busy} onClick={() => setStatus(report.id, "resolved")} className="flex items-center gap-1 border-2 border-black bg-[var(--acid)] px-3 py-2 text-xs font-black"><CheckCircle2 className="h-4 w-4" />已处理</button> : <button disabled={busy} onClick={() => setStatus(report.id, "open")} className="flex items-center gap-1 border border-black px-3 py-2 text-xs font-black"><RotateCcw className="h-4 w-4" />重新打开</button>}</div></div>
            {report.resolution_note && <p className="mt-3 border-t pt-3 text-sm">处理结论：{report.resolution_note}</p>}
            {report.status === "open" && <label className="mt-4 block text-xs font-black">处理结论（会展示给举报人）<textarea value={notes[report.id] || ""} onChange={e => setNotes(current => ({ ...current, [report.id]: e.target.value }))} maxLength={1000} rows={2} className="cyber-input mt-2" placeholder="说明核实情况和处理措施" /></label>}
            <Link href="/admin/projects" className="mt-3 inline-block text-xs font-bold underline">去项目审核下架违规作品</Link>
          </article>)}
        </div>
      )}
      {total > 20 && <Pagination page={page} totalPages={Math.ceil(total / 20)} onChange={setPage} />}
    </div>
  );
}
