"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Download, ArrowLeft, Share2, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { CommentsSection } from "@/components/comments/CommentsSection";

export default function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const { user, openAuth } = useAuth();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pattern, setPattern] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api(`/patterns/${id}`)
      .then((d) => {
        setPattern(d);
        setLiked(!!d.is_liked);
        setLikesCount(d.likes_count || 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Render pixel preview to canvas
  useEffect(() => {
    if (!pattern?.grid_data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let grid: string[][];
    try { grid = JSON.parse(pattern.grid_data); } catch { return; }
    if (!grid.length) return;

    const cellSize = Math.max(4, Math.min(20, Math.floor(200 / Math.max(grid.length, grid[0].length))));
    const rows = grid.length;
    const cols = grid[0].length;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    canvas.style.width = Math.min(cols * cellSize * 2, 400) + "px";
    canvas.style.height = Math.min(rows * cellSize * 2, 400) + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < (grid[y]?.length || 0); x++) {
        const color = grid[y][x];
        ctx.fillStyle = color || "transparent";
        ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }
  }, [pattern]);

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    try { await api(`/patterns/${id}/download`, { method: "POST" }); } catch { /* still download */ }
    const link = document.createElement("a");
    link.download = `pattern-${id}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const handleRemix = () => {
    if (!user) { openAuth(); return; }
    try {
      const gridData = JSON.parse(pattern.grid_data);
      sessionStorage.setItem("editorRemix", JSON.stringify({
        gridData,
        colorCounts: pattern.color_counts ? JSON.parse(pattern.color_counts) : null,
        title: pattern.title,
        brand: pattern.brand || "perler",
      }));
    } catch { /* ignore */ }
    router.push("/editor?remix=1");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLikeClick = async () => {
    if (!user) { openAuth(); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const d = await api(`/patterns/${id}/like`, { method: "POST" });
      setLiked(d.liked);
      setLikesCount((c: number) => d.liked ? c + 1 : Math.max(0, c - 1));
    } catch { /* ignore */ }
    finally { setLikeLoading(false); }
  };

  // Color counts from API
  const colorCounts: Record<string, number> = (() => {
    if (!pattern?.color_counts) return {};
    try { return JSON.parse(pattern.color_counts); } catch { return {}; }
  })();

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (notFound || !pattern) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "图案未找到" : "Pattern not found"}
          </h1>
          <Link href="/gallery" className="text-sm text-[var(--primary)] hover:underline">{lang === "zh" ? "返回图纸库" : "Back to gallery"}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link href="/gallery" className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Pixel Preview */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex items-center justify-center"
            style={{ boxShadow: "var(--card-shadow)" }}>
            <canvas ref={canvasRef} className="pixel-render" />
          </motion.div>

          {/* Right — Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                {pattern.title}
              </h1>
              <p className="text-sm text-foreground/50">👤 <Link href={`/user/${pattern.user_id}`} className="hover:text-[var(--primary)] hover:underline transition-colors">{pattern.author_name || "Anonymous"}</Link></p>
              {pattern.description && (
                <p className="text-sm text-foreground/50 mt-2">{pattern.description}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button onClick={handleLikeClick} disabled={likeLoading}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  liked ? "bg-[var(--bead-coral)] text-white" : "border border-[var(--border)] text-foreground/60 hover:border-[var(--bead-coral)] hover:text-[var(--bead-coral)]"
                }`}>
                <Heart className={`h-4 w-4 ${liked ? "fill-white" : ""}`} />
                {likesCount} {t("gallery.detail.like")}
              </button>
              <button onClick={handleRemix}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-foreground/60 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all">
                <Pencil className="h-4 w-4" />
                {lang === "zh" ? "二次创作" : "Remix"}
              </button>
              <button onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
                <Download className="h-4 w-4" /> {t("gallery.detail.download")}
              </button>
              <button onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-foreground/60 hover:bg-[var(--surface-hover)] transition-all">
                <Share2 className="h-4 w-4" />
                {copied ? (lang === "zh" ? "已复制!" : "Copied!") : t("gallery.detail.share")}
              </button>
            </div>

            {/* Materials list */}
            {Object.keys(colorCounts).length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  {t("gallery.detail.materials")} ({Object.keys(colorCounts).length} {t("common.colors")})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(colorCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([color, count]) => (
                      <div key={color} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs">
                        <span className="w-4 h-4 rounded-sm shrink-0 border border-black/5" style={{ backgroundColor: color }} />
                        <span className="truncate font-mono text-[10px]">{color}</span>
                        <span className="text-foreground/40 ml-auto">{count}</span>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-foreground/30 mt-3">{pattern.grid_size}×{pattern.grid_size} beads · {pattern.brand}</p>
              </div>
            )}

            {/* Comments */}
            <CommentsSection patternId={Number(id)} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
