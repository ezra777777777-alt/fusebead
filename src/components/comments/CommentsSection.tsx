"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";

interface Comment {
  id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
  user_id: number;
}

export function CommentsSection({ patternId }: { patternId: number }) {
  const { user, openAuth } = useAuth();
  const { t, lang } = useLang();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const fetchComments = () => {
    setLoading(true);
    api(`/patterns/${patternId}/comments`)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComments(); }, [patternId]);

  const handlePost = async () => {
    if (!user) { openAuth(); return; }
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    try {
      await api(`/patterns/${patternId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      fetchComments();
    } catch {
      setError(lang === "zh" ? "发布失败" : "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await api(`/patterns/${patternId}/comments/${commentId}`, { method: "DELETE" });
      fetchComments();
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
        <MessageSquare className="h-4 w-4" />
        {t("gallery.detail.comments")} ({comments.length})
      </h3>

      {/* Comment input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePost()}
          placeholder={t("gallery.detail.commentPlaceholder")}
          maxLength={1000}
          className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
        />
        <button
          onClick={handlePost}
          disabled={posting || !text.trim()}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
        >
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("gallery.detail.commentPost")}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-foreground/20" /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-foreground/30 text-center py-4">{t("gallery.detail.noComments")}</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-xs font-bold shrink-0" style={{ color: "var(--primary)" }}>
                {c.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{c.username}</span>
                  <span className="text-xs text-foreground/30">{new Date(c.created_at).toLocaleDateString()}</span>
                  {user?.id === c.user_id && (
                    <button onClick={() => handleDelete(c.id)} className="ml-auto p-0.5 rounded hover:bg-red-50">
                      <Trash2 className="h-3 w-3 text-foreground/20 hover:text-red-400" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground/60 mt-0.5 break-words">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
