"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminLogsPage() {
  const { lang } = useLang();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    api(`/admin/logs?page=${page}&limit=${PAGE_SIZE}`)
      .then((d) => { setLogs(d.logs); setTotal(d.total); })
      .catch(() => {});
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const actionLabels: Record<string, string> = {
    update_user: lang === "zh" ? "编辑用户" : "Update User",
    update_settings: lang === "zh" ? "修改设置" : "Update Settings",
    approve: lang === "zh" ? "通过图案" : "Approve Pattern",
    reject: lang === "zh" ? "拒绝图案" : "Reject Pattern",
    feature: lang === "zh" ? "推荐图案" : "Feature Pattern",
    unfeature: lang === "zh" ? "取消推荐" : "Unfeature Pattern",
    softDelete: lang === "zh" ? "删除图案" : "Delete Pattern",
    restore: lang === "zh" ? "恢复图案" : "Restore Pattern",
    hard_delete: lang === "zh" ? "永久删除" : "Hard Delete",
    delete_comment: lang === "zh" ? "删除评论" : "Delete Comment",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {lang === "zh" ? "操作日志" : "Operation Logs"}
      </h1>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
          <FileText className="h-16 w-16 mb-4" />
          <p className="text-sm">{lang === "zh" ? "暂无日志" : "No logs yet"}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-hover)] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "时间" : "Time"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "管理员" : "Admin"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "操作" : "Action"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "目标" : "Target"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "详情" : "Detail"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-hover)]/50">
                    <td className="px-4 py-3 text-foreground/40 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{log.admin_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/50">
                      {log.target_type}{log.target_id ? ` #${log.target_id}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/30 max-w-[200px] truncate">{log.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
