"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Download, ArrowLeft, Share2, Bookmark } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { useAuth } from "@/lib/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MOCK_GALLERY } from "@/lib/mock-data";

export default function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const { user, openAuth } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [liked, setLiked] = useState(false);
  const [collected, setCollected] = useState(false);
  const [copied, setCopied] = useState(false);

  const pattern = MOCK_GALLERY.find((p) => p.id === id);

  if (!pattern) {
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

  // Count colors in thumbnail
  const colorCounts: Record<string, number> = {};
  pattern.thumbnail.flat().forEach((c) => { if (c) colorCounts[c] = (colorCounts[c] || 0) + 1; });

  // Render pixel preview to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = 20;
    const rows = pattern.thumbnail.length;
    const cols = pattern.thumbnail[0].length;
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    canvas.style.width = cols * cellSize * 2 + "px";
    canvas.style.height = rows * cellSize * 2 + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const color = pattern.thumbnail[y][x];
        ctx.fillStyle = color || "transparent";
        ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }
  }, [pattern]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `pattern-${pattern.id}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLikeClick = () => {
    if (!user) { openAuth(); return; }
    setLiked(!liked);
  };

  const handleCollectClick = () => {
    if (!user) { openAuth(); return; }
    setCollected(!collected);
  };

  // Color name lookup
  const colorNames: Record<string, string> = {
    "#FF9EB5": lang === "zh" ? "粉色" : "Pink",
    "#FFD1DC": lang === "zh" ? "浅粉" : "Light Pink",
    "#FFE082": lang === "zh" ? "黄色" : "Yellow",
    "#87CEEB": lang === "zh" ? "天蓝" : "Sky Blue",
    "#B8E4F0": lang === "zh" ? "浅蓝" : "Light Blue",
    "#D4B8E0": lang === "zh" ? "淡紫" : "Lavender",
    "#5D4E5D": lang === "zh" ? "深紫灰" : "Dark Purple Gray",
    "#FFF0F3": lang === "zh" ? "米白" : "Cream White",
    "#FFFFFF": lang === "zh" ? "白色" : "White",
  };

  return (
    <RequireAuth>
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
                  {lang === "zh" ? pattern.title.zh : pattern.title.en}
                </h1>
                <p className="text-sm text-foreground/50">👤 {pattern.author}</p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button onClick={handleLikeClick}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    liked ? "bg-[var(--bead-coral)] text-white" : "border border-[var(--border)] text-foreground/60 hover:border-[var(--bead-coral)] hover:text-[var(--bead-coral)]"
                  }`}>
                  <Heart className={`h-4 w-4 ${liked ? "fill-white" : ""}`} />
                  {liked ? (pattern.likes + 1) : pattern.likes} {t("gallery.detail.like")}
                </button>
                <button onClick={handleCollectClick}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    collected ? "bg-[var(--blue-primary)] text-white" : "border border-[var(--border)] text-foreground/60 hover:border-[var(--blue-primary)] hover:text-[var(--blue-primary)]"
                  }`}>
                  <Bookmark className={`h-4 w-4 ${collected ? "fill-white" : ""}`} />
                  {t("gallery.detail.collect")}
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
                        <span className="truncate">{colorNames[color] || color}</span>
                        <span className="text-foreground/40 ml-auto">{count}</span>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-foreground/30 mt-3">{pattern.thumbnail.length}×{pattern.thumbnail[0].length} beads</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
