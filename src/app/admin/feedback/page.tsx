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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [replies, setReplies] = useState<Record<number, string>>({});
  const PAGE_SIZE = 20;

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [data, count] = await Promise.all([api(`/admin/feedback?page=${page}&limit=${PAGE_SIZE}`), api("/admin/feedback/unread-count")]);
      setFeedbacks(data.feedbacks); setTotal(data.total); setUnread(count.count);
    } catch (e) { setError(e instanceof Error ? e.message : "读取反馈失败，请重试"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleMarkRead = async (id: number) => {
    setBusy(true); setError("");
    try { await api(`/admin/feedback/${id}/read`, { method: "POST" }); await fetchData(); }
    catch (e) { setError(e instanceof Error ? e.message : "标记失败"); }
    finally { setBusy(false); }
  };

  const handleMarkAllRead = async () => {
    setBusy(true); setError("");
    try { await api("/admin/feedback/read-all", { method: "POST" }); await fetchData(); }
    catch (e) { setError(e instanceof Error ? e.message : "标记失败"); }
    finally { setBusy(false); }
  };

  const reply = async (id: number) => {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api(`/admin/feedback/${id}/reply`, { method: "POST", body: JSON.stringify({ reply: replies[id] }) });
      setNotice(`反馈 #${id} 已回复，用户可在个人中心查看。`);
      setReplies(current => { const next = { ...current }; delete next[id]; return next; });
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : "回复失败，请重试"); }
    finally { setBusy(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatBeijingTime = (value: string) => {
    const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
      ? value
      : value.replace(" ", "T") + "Z";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(normalized));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "用户反馈" : "Feedback"}
        </h1>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={busy || loading}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              {lang === "zh" ? `全部标为已读 (${unread})` : `Mark all read (${unread})`}
            </button>
          )}
          <button aria-label="刷新反馈列表" disabled={busy || loading} onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100">
            <RefreshCw className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {error && <p role="alert" className="border border-red-500 bg-red-50 p-4 text-red-700">{error}</p>}
      {notice && <p role="status" className="border border-green-600 bg-green-50 p-4 text-green-800">{notice}</p>}
      <div className="space-y-3">
        {loading ? <p className="p-8 text-center">正在读取反馈…</p> : error && !feedbacks.length ? null : feedbacks.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-foreground/30">
              {lang === "zh" ? "暂无反馈" : "No feedback yet"}
            </p>
          </div>
        ) : (
          feedbacks.map((f) => (
            <article
              key={f.id}
              className={`rounded-2xl border bg-white p-5 transition-colors ${
                !f.is_read ? "border-[var(--bead-coral)]/30 bg-[var(--bead-coral)]/[0.01]" : "border-[var(--border)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
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
                    {f.username} ({f.email}) — {formatBeijingTime(f.created_at)}
                  </p>
                </div>
                {!f.is_read && (
                  <button
                    onClick={() => handleMarkRead(f.id)}
                    disabled={busy}
                    className="text-xs text-[var(--primary)] hover:underline shrink-0"
                  >
                    {lang === "zh" ? "标为已读" : "Mark read"}
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/60 ml-6 whitespace-pre-wrap [overflow-wrap:anywhere]">{f.message}</p>
              {f.reply && <div className="mt-4 border-l-4 border-green-600 bg-green-50 p-3 [overflow-wrap:anywhere]"><strong className="text-sm">站内回复</strong><p className="mt-2 whitespace-pre-wrap text-sm">{f.reply}</p></div>}
              <form onSubmit={e => { e.preventDefault(); void reply(f.id); }} className="mt-4 space-y-3 border-t pt-4">
                <label className="block text-sm font-semibold">回复反馈 #{f.id}<textarea required maxLength={2000} rows={3} value={replies[f.id] ?? ""} onChange={e => setReplies(current => ({ ...current, [f.id]: e.target.value }))} placeholder="写明处理结果或下一步，用户将在个人中心看到。" className="cyber-input mt-2" /></label>
                <button disabled={busy || !replies[f.id]?.trim()} className="border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black disabled:opacity-40">{f.reply ? "更新站内回复" : "发送站内回复"}</button>
              </form>
            </article>
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
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
