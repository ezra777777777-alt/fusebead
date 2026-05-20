"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { Search, Grid3X3, Check, X, Star, Trash2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_TABS = ["all", "pending", "approved", "deleted"] as const;

export default function AdminPatternsPage() {
  const { lang } = useLang();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 20;

  const fetchPatterns = () => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status, search });
    api(`/admin/patterns?${params}`)
      .then((d) => { setPatterns(d.patterns); setTotal(d.total); })
      .catch(() => {});
  };

  useEffect(() => { fetchPatterns(); }, [page, status]);
  useEffect(() => { setPage(1); fetchPatterns(); }, [search]);

  const handleAction = async (id: number, action: string) => {
    await api(`/admin/patterns/${id}`, { method: "PUT", body: JSON.stringify({ action }) });
    fetchPatterns();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const statusLabel = (s: string) => {
    const map: Record<string, string> = { all: lang === "zh" ? "全部" : "All", pending: lang === "zh" ? "待审核" : "Pending", approved: lang === "zh" ? "已通过" : "Approved", deleted: lang === "zh" ? "已删除" : "Deleted" };
    return map[s] || s;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {lang === "zh" ? "图案审核" : "Pattern Moderation"}
      </h1>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                status === s ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] text-foreground/50 hover:text-foreground"
              }`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "zh" ? "搜索..." : "Search..."}
            className="w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]" />
        </div>
      </div>

      {patterns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
          <Grid3X3 className="h-16 w-16 mb-4" />
          <p className="text-sm">{lang === "zh" ? "暂无图案" : "No patterns"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patterns.map((p) => (
            <div key={p.id} className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>{p.title}</h3>
                    <p className="text-xs text-foreground/40">{p.author_name} · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.is_deleted ? "bg-red-100 text-red-500" :
                    !p.is_approved ? "bg-yellow-100 text-yellow-600" :
                    "bg-green-100 text-green-600"
                  }`}>
                    {p.is_deleted ? (lang === "zh" ? "已删除" : "Deleted") :
                     !p.is_approved ? (lang === "zh" ? "待审核" : "Pending") :
                     (lang === "zh" ? "已通过" : "Approved")}
                    {p.is_featured ? " ⭐" : ""}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
                  {!p.is_deleted && (
                    <>
                      {!p.is_approved ? (
                        <button onClick={() => handleAction(p.id, "approve")}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                          <Check className="h-3 w-3" /> {lang === "zh" ? "通过" : "Approve"}
                        </button>
                      ) : (
                        <button onClick={() => handleAction(p.id, "reject")}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors">
                          <X className="h-3 w-3" /> {lang === "zh" ? "拒绝" : "Reject"}
                        </button>
                      )}
                      <button onClick={() => handleAction(p.id, p.is_featured ? "unfeature" : "feature")}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                          p.is_featured
                            ? "bg-purple-50 text-purple-600 hover:bg-purple-100"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}>
                        <Star className="h-3 w-3" /> {p.is_featured ? (lang === "zh" ? "取消推荐" : "Unfeature") : (lang === "zh" ? "推荐" : "Feature")}
                      </button>
                      <button onClick={() => handleAction(p.id, "softDelete")}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Trash2 className="h-3 w-3" /> {lang === "zh" ? "删除" : "Delete"}
                      </button>
                    </>
                  )}
                  {p.is_deleted && (
                    <button onClick={() => handleAction(p.id, "restore")}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      <RotateCcw className="h-3 w-3" /> {lang === "zh" ? "恢复" : "Restore"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-foreground/40">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
