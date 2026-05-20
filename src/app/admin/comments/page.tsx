"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { Trash2, ExternalLink, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

export default function AdminCommentsPage() {
  const { lang } = useLang();
  const [comments, setComments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchComments = () => {
    api(`/admin/comments?page=${page}&limit=${PAGE_SIZE}`)
      .then((d) => { setComments(d.comments); setTotal(d.total); })
      .catch(() => {});
  };

  useEffect(() => { fetchComments(); }, [page]);

  const handleDelete = async (id: number) => {
    await api(`/admin/comments/${id}`, { method: "DELETE" });
    fetchComments();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {lang === "zh" ? "评论管理" : "Comment Management"}
      </h1>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
          <MessageSquare className="h-16 w-16 mb-4" />
          <p className="text-sm">{lang === "zh" ? "暂无评论" : "No comments"}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-hover)] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "内容" : "Content"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "评论者" : "Author"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "所属图案" : "Pattern"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "时间" : "Date"}</th>
                  <th className="px-4 py-3 font-medium text-foreground/40">{lang === "zh" ? "操作" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {comments.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--surface-hover)]/50">
                    <td className="px-4 py-3 max-w-xs truncate">{c.content}</td>
                    <td className="px-4 py-3 text-foreground/50">{c.author_name}</td>
                    <td className="px-4 py-3">
                      <Link href={`/gallery/${c.pattern_id}`} target="_blank"
                        className="text-[var(--primary)] hover:underline flex items-center gap-1 text-xs">
                        {c.pattern_title} <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground/30 text-xs">{new Date(c.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-foreground/30 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
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
