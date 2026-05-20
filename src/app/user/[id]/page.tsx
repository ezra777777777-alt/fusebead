"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Grid3X3, Heart, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";

function thumbnailFromGrid(gridData: string, maxSize = 8): string[][] {
  try {
    const grid: string[][] = JSON.parse(gridData);
    if (!grid.length) return [];
    const step = Math.max(1, Math.floor(grid.length / maxSize));
    const result: string[][] = [];
    for (let y = 0; y < grid.length && result.length < maxSize; y += step) {
      const row: string[] = [];
      const rowLen = grid[y].length;
      const colStep = Math.max(1, Math.floor(rowLen / maxSize));
      for (let x = 0; x < rowLen && row.length < maxSize; x += colStep) {
        row.push(grid[y][x] || "");
      }
      result.push(row);
    }
    return result;
  } catch { return []; }
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api(`/user/profile/${id}`).catch(() => null),
      api(`/patterns?userId=${id}&limit=50`).catch(() => ({ patterns: [] })),
    ]).then(([p, d]) => {
      if (!p) { setNotFound(true); }
      else { setProfile(p); setPatterns(d.patterns); }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "用户未找到" : "User not found"}
          </h1>
          <Link href="/gallery" className="text-sm text-[var(--primary)] hover:underline">
            {lang === "zh" ? "返回图纸库" : "Back to gallery"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/gallery" className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> {lang === "zh" ? "返回" : "Back"}
        </Link>

        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-3xl font-bold border-2 border-[var(--border)]" style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {profile.username}
              </h1>
              <p className="text-xs text-foreground/40 mt-1">
                {lang === "zh" ? "加入于 " : "Joined "}{new Date(profile.created_at).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-foreground/50">
                <span className="flex items-center gap-1"><Grid3X3 className="h-3.5 w-3.5" /> {profile.patternCount} {lang === "zh" ? "个图案" : "patterns"}</span>
                <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" style={{ color: "var(--bead-coral)" }} /> {profile.totalLikes} {lang === "zh" ? "次点赞" : "likes"}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Patterns grid */}
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? `${profile.username} 的作品` : `${profile.username}'s Patterns`}
        </h2>
        {patterns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
            <Grid3X3 className="h-12 w-12 mx-auto text-foreground/10 mb-3" />
            <p className="text-sm text-foreground/30">{lang === "zh" ? "暂无公开作品" : "No public patterns yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {patterns.map((p) => {
              const thumb = thumbnailFromGrid(p.grid_data);
              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -4, boxShadow: "var(--card-shadow)" }}
                  onClick={() => router.push(`/gallery/${p.id}`)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden cursor-pointer transition-all"
                >
                  <div className="aspect-square p-4 flex items-center justify-center bg-[var(--surface-hover)]">
                    {thumb.length > 0 ? (
                      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${thumb[0].length}, 1fr)`, width: 80, height: 80 }}>
                        {thumb.flat().map((color, i) => (
                          <div key={i} className="rounded-sm" style={{ backgroundColor: color || "transparent" }} />
                        ))}
                      </div>
                    ) : (
                      <Grid3X3 className="h-10 w-10 text-foreground/10" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold truncate" style={{ fontFamily: "var(--font-display)" }}>{p.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-foreground/40 mt-1">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" style={{ color: "var(--bead-coral)" }} /> {p.likes_count}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
