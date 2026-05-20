"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { Mail, MailOpen, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export default function AdminFeedbackPage() {
  const { lang } = useLang();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unread, setUnread] = useState(0);
  const PAGE_SIZE = 20;

  const fetchData = () => {
    api(`/admin/feedback?page=${page}&limit=${PAGE_SIZE}`)
      .then((d) => { setFeedbacks(d.feedbacks); setTotal(d.total); })
      .catch(() => {});
    api("/admin/feedback/unread-count")
      .then((d) => setUnread(d.count))
      .catch(() => {});
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleMarkRead = async (id: number) => {
    await api(`/admin/feedback/${id}/read`, { method: "POST" });
    fetchData();
  };

  const handleMarkAllRead = async () => {
    await api("/admin/feedback/read-all", { method: "POST" });
    fetchData();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "用户反馈" : "Feedback"}
        </h1>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              {lang === "zh" ? `全部标为已读 (${unread})` : `Mark all read (${unread})`}
            </button>
          )}
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100">
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {feedbacks.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-foreground/30">
              {lang === "zh" ? "暂无反馈" : "No feedback yet"}
            </p>
          </div>
        ) : (
          feedbacks.map((f) => (
            <div
              key={f.id}
              className={`rounded-2xl border bg-white p-5 transition-colors ${
                !f.is_read ? "border-[var(--bead-coral)]/30 bg-[var(--bead-coral)]/[0.01]" : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    {!f.is_read ? (
                      <Mail className="h-4 w-4 text-[var(--bead-coral)]" />
                    ) : (
                      <MailOpen className="h-4 w-4 text-gray-300" />
                    )}
                    <h3 className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                      {f.subject}
                    </h3>
                  </div>
                  <p className="text-xs text-foreground/40 mt-1 ml-6">
                    {f.username} ({f.email}) — {new Date(f.created_at).toLocaleString()}
                  </p>
                </div>
                {!f.is_read && (
                  <button
                    onClick={() => handleMarkRead(f.id)}
                    className="text-xs text-[var(--primary)] hover:underline shrink-0"
                  >
                    {lang === "zh" ? "标为已读" : "Mark read"}
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/60 ml-6 whitespace-pre-wrap">{f.message}</p>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-foreground/40">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p - 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
