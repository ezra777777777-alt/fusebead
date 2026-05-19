"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Heart, Download, ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { useAuth } from "@/lib/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MOCK_GALLERY } from "@/lib/mock-data";

const CATEGORIES = ["all", "hot", "new", "cute", "anime", "animals", "cartoon", "landscape", "characters", "holiday"] as const;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const PAGE_SIZE = 12;

export default function GalleryPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [page, setPage] = useState(1);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...MOCK_GALLERY];

    if (category !== "all") {
      if (category === "hot") list = list.sort((a, b) => b.likes - a.likes);
      else if (category === "new") list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      else list = list.filter((p) => p.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.en.toLowerCase().includes(q) || p.title.zh.includes(q) || p.author.toLowerCase().includes(q));
    }

    if (sort === "newest") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else list.sort((a, b) => b.likes - a.likes);

    return list;
  }, [category, search, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const catLabel = (c: string) => t(`gallery.categories.${c}`);

  return (
    <RequireAuth>
      <div className="min-h-screen pt-16 bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
            📚 {t("gallery.title")}
          </h1>
          <p className="text-sm text-foreground/50">
            {lang === "zh" ? "探索社区创作的精美拼豆图案" : "Explore beautiful bead patterns from the community"}
          </p>
        </motion.div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c); setPage(1); }}
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
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
            <Grid3X3 className="h-16 w-16 mb-4" />
            <p className="text-sm">{t("gallery.empty")}</p>
          </div>
        ) : (
          <motion.div key={`${category}-${sort}-${page}`} variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paged.map((p) => (
              <motion.div
                key={p.id}
                variants={fadeUp}
                onClick={() => router.push(`/gallery/${p.id}`)}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden cursor-pointer hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                style={{ boxShadow: "var(--card-shadow)" }}
              >
                {/* Thumbnail */}
                <div className="aspect-square p-5 flex items-center justify-center bg-[var(--surface-hover)]">
                  <div className="grid gap-px pixel-render" style={{ gridTemplateColumns: `repeat(${p.thumbnail[0].length}, 1fr)`, width: 96, height: 96 }}>
                    {p.thumbnail.flat().map((color, i) => (
                      <div key={i} className="rounded-sm" style={{ backgroundColor: color || "transparent" }} />
                    ))}
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold mb-1 truncate" style={{ fontFamily: "var(--font-display)" }}>
                    {lang === "zh" ? p.title.zh : p.title.en}
                  </h3>
                  <p className="text-xs text-foreground/40 mb-2">👤 {p.author}</p>
                  <div className="flex items-center gap-3 text-xs text-foreground/40">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" style={{ color: "var(--bead-coral)" }} /> {p.likes}</span>
                    <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {p.downloads}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-full p-2 border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                  page === n
                    ? "bg-[var(--primary)] text-white"
                    : "text-foreground/50 hover:text-foreground hover:bg-[var(--surface-hover)]"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-full p-2 border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-hover)] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        </div>
      </div>
    </RequireAuth>
  );
}
