"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Pagination } from "@/components/shared/Pagination";

type Feedback = { id: number; subject: string; message: string; is_read: number; reply: string; replied_at: string | null };

export function MyFeedback() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api<{ feedbacks: Feedback[]; total: number }>(`/user/feedback?page=${page}&limit=10`);
      setItems(result.feedbacks); setTotal(result.total);
    } catch (e) { setError(e instanceof Error ? e.message : "反馈加载失败，请重试"); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  return <section aria-label="我的反馈" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-black/60">通过右下角反馈入口提交问题；管理员的站内回复会保存在这里。</p><button disabled={loading} onClick={load} className="font-bold underline disabled:opacity-40">刷新反馈</button></div>
    {error ? <p role="alert" className="border-2 border-red-600 bg-red-50 p-4 text-red-700">{error}</p> : loading ? <p className="py-10 text-center">正在读取反馈…</p> : items.length ? items.map(item => <article key={item.id} className="border-2 border-black bg-white p-5 [overflow-wrap:anywhere]">
      <p className="text-xs font-black text-[var(--orange)]">#{item.id} · {item.reply ? "已回复" : item.is_read ? "已查阅，等待回复" : "已提交，待查阅"}</p>
      <h2 className="mt-2 text-lg font-black">{item.subject}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.message}</p>
      {item.reply ? <div className="mt-4 border-l-4 border-[var(--acid)] bg-[var(--paper)] p-4"><h3 className="font-black">管理员回复</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.reply}</p></div> : <p className="mt-4 border-t pt-3 text-sm text-black/50">已读不代表问题已解决；处理说明将在回复后显示。</p>}
    </article>) : <p className="border-2 border-dashed px-5 py-12 text-center">还没有反馈记录。遇到问题时，可点击右下角反馈按钮。</p>}
    {total > 10 && <Pagination page={page} totalPages={Math.ceil(total / 10)} onChange={setPage} />}
  </section>;
}
