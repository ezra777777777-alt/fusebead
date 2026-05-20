"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Heart, Download, Grid3X3 } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";
import { GalleryFAB } from "@/components/gallery/GalleryFAB";
import { Pagination } from "@/components/shared/Pagination";

const CATEGORIES = ["all", "hot", "new", "cute", "anime", "animals", "cartoon", "landscape", "characters", "holiday"] as const;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const PAGE_SIZE = 12;

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
  } catch {
    return [];
  }
}

export default function GalleryPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [page, setPage] = useState(1);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPatterns = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category === "hot") params.set("sort", "popular");
    else if (category === "new") params.set("sort", "newest");
    else if (category !== "all") params.set("category", category);
    else params.set("sort", sort);
    if (search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    api(`/patterns?${params.toString()}`)
      .then((d) => { setPatterns(d.patterns); setTotal(d.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, sort, page, search]);

  useEffect(() => { fetchPatterns(); }, [fetchPatterns]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const catLabel = (c: string) => t(`gallery.categories.${c}`);

  return (<>
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
            📚 {t("gallery.title")}
          </h1>
          <p className="text-sm text-foreground/50">{t("gallery.subtitle")}</p>
        </motion.div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c); setPage(1); setSort("newest"); }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                category === c
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-foreground/50 hover:text-foreground hover:bg-[var(--surface-hover)]"
              }`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t("gallery.search")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex gap-2">
            {(["newest", "popular"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setSort(s); setPage(1); }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  sort === s
                    ? "bg-[var(--surface-hover)] text-[var(--primary)]"
                    : "text-foreground/40 hover:text-foreground"
                }`}
              >
                {t(`gallery.sort.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="aspect-square p-5 flex items-center justify-center bg-[var(--surface-hover)]">
                  <div className="w-24 h-24 rounded-lg bg-foreground/5 animate-pulse" />
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-foreground/5 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-foreground/5 animate-pulse" />
                  <div className="flex gap-3">
                    <div className="h-3 w-12 rounded bg-foreground/5 animate-pulse" />
                    <div className="h-3 w-12 rounded bg-foreground/5 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
            <Grid3X3 className="h-16 w-16 mb-4" />
            <p className="text-sm">{t("gallery.empty")}</p>
          </div>
        ) : (
          <motion.div key={`${category}-${sort}-${page}`} variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {patterns.map((p) => {
              const thumb = thumbnailFromGrid(p.grid_data);
              return (
                <motion.div
                  key={p.id}
                  variants={fadeUp}
                  onClick={() => router.push(`/gallery/${p.id}`)}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden cursor-pointer hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                  style={{ boxShadow: "var(--card-shadow)" }}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square p-5 flex items-center justify-center bg-[var(--surface-hover)]">
                    {thumb.length > 0 ? (
                      <div className="grid gap-px pixel-render transition-all duration-300 group-hover:scale-125" style={{ gridTemplateColumns: `repeat(${thumb[0].length}, 1fr)`, width: 96, height: 96 }}>
                        {thumb.flat().map((color, i) => (
                          <div key={i} className="rounded-sm" style={{ backgroundColor: color || "transparent" }} />
                        ))}
                      </div>
                    ) : (
                      <Grid3X3 className="h-12 w-12 text-foreground/10" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold mb-1 truncate" style={{ fontFamily: "var(--font-display)" }}>
                      {p.title}
                    </h3>
                    <p className="text-xs text-foreground/40 mb-2">
                      👤 <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/user/${p.user_id}`); }}
                        className="hover:text-[var(--primary)] hover:underline transition-colors"
                      >{p.author_name || "Anonymous"}</button>
                    </p>
                    <div className="flex items-center gap-3 text-xs text-foreground/40">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" style={{ color: "var(--bead-coral)" }} /> {p.likes_count}</span>
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {p.downloads_count}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        )}
      </div>
    </div>
    <GalleryFAB />
  </>);
}

