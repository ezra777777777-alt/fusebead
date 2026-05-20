"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, ImagePlus, LayoutGrid, FolderHeart, Heart, Download, Grid3X3 } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

// ── Cartoon illustrations ──

function BearSVG() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <circle cx="22" cy="28" r="14" fill="#D4B8E0" />
      <circle cx="78" cy="28" r="14" fill="#D4B8E0" />
      <circle cx="22" cy="28" r="9" fill="#C4A8D0" />
      <circle cx="78" cy="28" r="9" fill="#C4A8D0" />
      {/* Head */}
      <circle cx="50" cy="55" r="40" fill="#FFD1DC" />
      {/* Eyes */}
      <circle cx="35" cy="48" r="5" fill="#5D4E5D" />
      <circle cx="65" cy="48" r="5" fill="#5D4E5D" />
      <circle cx="37" cy="46" r="1.5" fill="#fff" />
      <circle cx="67" cy="46" r="1.5" fill="#fff" />
      {/* Nose */}
      <ellipse cx="50" cy="60" rx="8" ry="5" fill="#FF9EB5" />
      {/* Mouth */}
      <path d="M44 67 Q50 74 56 67" stroke="#5D4E5D" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <circle cx="24" cy="58" r="6" fill="#FF9EB5" opacity="0.3" />
      <circle cx="76" cy="58" r="6" fill="#FF9EB5" opacity="0.3" />
    </svg>
  );
}

function RabbitSVG() {
  return (
    <svg width="90" height="110" viewBox="0 0 90 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <ellipse cx="25" cy="20" rx="9" ry="28" fill="#FFD1DC" transform="rotate(-10, 25, 20)" />
      <ellipse cx="65" cy="20" rx="9" ry="28" fill="#FFD1DC" transform="rotate(10, 65, 20)" />
      <ellipse cx="25" cy="20" rx="5" ry="20" fill="#FFB0C8" transform="rotate(-10, 25, 20)" />
      <ellipse cx="65" cy="20" rx="5" ry="20" fill="#FFB0C8" transform="rotate(10, 65, 20)" />
      {/* Head */}
      <ellipse cx="45" cy="65" rx="35" ry="32" fill="#FFF0F3" />
      {/* Eyes */}
      <circle cx="33" cy="58" r="4.5" fill="#5D4E5D" />
      <circle cx="57" cy="58" r="4.5" fill="#5D4E5D" />
      <circle cx="35" cy="56" r="1.5" fill="#fff" />
      <circle cx="59" cy="56" r="1.5" fill="#fff" />
      {/* Nose */}
      <path d="M43 65 L45 69 L47 65 Z" fill="#FF9EB5" />
      {/* Mouth */}
      <path d="M43 71 Q45 74 47 71" stroke="#5D4E5D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <circle cx="18" cy="68" r="7" fill="#FF9EB5" opacity="0.25" />
      <circle cx="72" cy="68" r="7" fill="#FF9EB5" opacity="0.25" />
    </svg>
  );
}

function RainbowSVG() {
  return (
    <svg width="160" height="90" viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 80 Q80 -20 150 80" stroke="#FF9EB5" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M18 80 Q80 -10 142 80" stroke="#FFE082" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M26 80 Q80 0 134 80" stroke="#87CEEB" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M34 80 Q80 10 126 80" stroke="#D4B8E0" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M42 80 Q80 20 118 80" stroke="#B8E4F0" strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function BeadDots() {
  const dots = [
    { color: "var(--bead-coral)", size: 10, x: "5%", y: "15%", delay: 0 },
    { color: "var(--bead-amber)", size: 8, x: "15%", y: "75%", delay: 0.1 },
    { color: "var(--blue-primary)", size: 12, x: "85%", y: "20%", delay: 0.2 },
    { color: "var(--bead-lavender)", size: 6, x: "90%", y: "65%", delay: 0.05 },
    { color: "var(--yellow-primary)", size: 9, x: "25%", y: "85%", delay: 0.15 },
    { color: "var(--bead-coral)", size: 7, x: "75%", y: "10%", delay: 0.25 },
    { color: "var(--blue-light)", size: 11, x: "10%", y: "45%", delay: 0.3 },
    { color: "var(--bead-amber)", size: 8, x: "70%", y: "80%", delay: 0.12 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {dots.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ delay: d.delay, duration: 0.4 }}
          className="absolute rounded-full"
          style={{
            backgroundColor: d.color,
            width: d.size,
            height: d.size,
            left: d.x,
            top: d.y,
          }}
        />
      ))}
    </div>
  );
}

// ── Animations ──

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

// ── Hero ──

export function Hero() {
  const { t } = useLang();
  const { user, openAuth } = useAuth();
  const router = useRouter();

  const goTo = (path: string) => {
    if (!user) { openAuth(); return; }
    router.push(path);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bead-dot-bg opacity-[0.04]" />
      <BeadDots />

      {/* Illustrations — right side, hidden on mobile */}
      <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 z-0">
        <div className="relative">
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="absolute -top-32 right-20">
            <BearSVG />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="absolute top-0 right-0">
            <RabbitSVG />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="absolute -top-16 -left-16">
            <RainbowSVG />
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm mb-8">
            <Sparkles className="h-4 w-4" style={{ color: "var(--pink-primary)" }} />
            <span className="text-foreground/60">🧩 Free &amp; Unlimited</span>
          </motion.div>

          {/* Title */}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6" style={{ fontFamily: "var(--font-display)" }}>
            {t("home.title1")}<br />
            <span className="bead-gradient-text">{t("home.title2")}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-foreground/60 max-w-xl mb-10 leading-relaxed">
            {t("home.subtitle")}
          </motion.p>

          {/* Buttons */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => goTo("/generator")}
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98] hover:shadow-lg hover:shadow-[var(--bead-coral)]/25"
              style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
              🛠️ {t("home.cta")} <ArrowRight className="h-5 w-5" />
            </button>
            <button onClick={() => goTo("/gallery")}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--blue-primary)] px-8 py-3.5 text-base font-semibold transition-all hover:bg-[var(--blue-primary)]/10 hover:scale-[1.03] active:scale-[0.98]"
              style={{ color: "var(--blue-primary)", fontFamily: "var(--font-display)" }}>
              📚 {t("home.browseGallery")}
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center gap-6 text-sm text-foreground/40">
            <span>✨ {t("home.stat2")}</span><span className="hidden sm:inline">·</span>
            <span>🎨 60+ {t("home.stat1")}</span><span className="hidden sm:inline">·</span>
            <span>📦 PNG + PDF</span><span className="hidden sm:inline">·</span>
            <span>⚡ {t("home.stat3")}</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Feature Entry Cards ──

export function FeatureEntryCards() {
  const { t } = useLang();
  const { user, openAuth } = useAuth();
  const router = useRouter();

  const goTo = (path: string) => {
    if (!user) { openAuth(); return; }
    router.push(path);
  };

  const cards = [
    { icon: ImagePlus, emoji: "🛠️", title: t("home.featureEntry1"), desc: t("home.featureEntry1Desc"), path: "/generator", color: "var(--bead-coral)" },
    { icon: LayoutGrid, emoji: "📚", title: t("home.featureEntry2"), desc: t("home.featureEntry2Desc"), path: "/gallery", color: "var(--blue-primary)" },
    { icon: FolderHeart, emoji: "💖", title: t("home.featureEntry3"), desc: t("home.featureEntry3Desc"), path: "/dashboard", color: "var(--bead-lavender)" },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <motion.div key={card.path} variants={fadeUp}
              onClick={() => goTo(card.path)}
              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 cursor-pointer hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
              style={{ boxShadow: "var(--card-shadow)" }}>
              <div className="text-4xl mb-4">{card.emoji}</div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>{card.title}</h3>
              <p className="text-sm text-foreground/50 leading-relaxed mb-4">{card.desc}</p>
              <ArrowRight className="h-5 w-5 text-foreground/20 group-hover:translate-x-1 transition-transform" style={{ color: card.color }} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Pattern Recommendations ──

export function PatternRecommendations() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/patterns?sort=popular&limit=8")
      .then((d) => setPatterns(d.patterns))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function thumbFromGrid(gridData: string, maxSize = 8): string[][] {
    try {
      const grid: string[][] = JSON.parse(gridData);
      if (!grid.length) return [];
      const step = Math.max(1, Math.floor(grid.length / maxSize));
      const result: string[][] = [];
      for (let y = 0; y < grid.length && result.length < maxSize; y += step) {
        const row: string[] = [];
        const colStep = Math.max(1, Math.floor(grid[y].length / maxSize));
        for (let x = 0; x < (grid[y]?.length || 0) && row.length < maxSize; x += colStep) {
          row.push(grid[y][x] || "");
        }
        result.push(row);
      }
      return result;
    } catch { return []; }
  }

  return (
    <section className="py-16 sm:py-20 bg-[var(--surface-hover)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
            💖 {t("home.recommendations")}
          </h2>
          <p className="text-foreground/50">{lang === "zh" ? "发现社区中最受欢迎的拼豆图案" : "Discover the most popular patterns in the community"}</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden animate-pulse">
                <div className="aspect-square bg-[var(--surface-hover)]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[var(--surface-hover)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--surface-hover)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : patterns.length === 0 ? null : (
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {patterns.map((p) => {
              const thumb = thumbFromGrid(p.grid_data);
              return (
                <motion.div key={p.id} variants={fadeUp}
                  onClick={() => router.push(`/gallery/${p.id}`)}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden cursor-pointer hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300"
                  style={{ boxShadow: "var(--card-shadow)" }}>
                  <div className="aspect-square p-4 flex items-center justify-center bg-[var(--surface-hover)]">
                    {thumb.length > 0 ? (
                      <div className="grid gap-px transition-transform duration-300 group-hover:scale-125" style={{ gridTemplateColumns: `repeat(${thumb[0].length}, 1fr)`, width: 80, height: 80 }}>
                        {thumb.flat().map((color, i) => (
                          <div key={i} className="rounded-sm" style={{ backgroundColor: color || "transparent" }} />
                        ))}
                      </div>
                    ) : (
                      <Grid3X3 className="h-10 w-10 text-foreground/10" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold mb-1 truncate" style={{ fontFamily: "var(--font-display)" }}>
                      {p.title}
                    </h3>
                    <p className="text-xs text-foreground/40 mb-2">👤 {p.author_name || "Anonymous"}</p>
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
      </div>
    </section>
  );
}

// ── How It Works ──

export function HowItWorks() {
  const { lang } = useLang();
  const steps = [
    { n: "01", icon: "📤", en: "Upload any photo, drawing, or screenshot.", zh: "上传任意照片、手绘或截图。" },
    { n: "02", icon: "🎨", en: "Our engine matches every pixel to real bead colors.", zh: "智能算法将每个像素匹配到真实拼豆颜色。" },
    { n: "03", icon: "📦", en: "Download your pattern as PNG or PDF with materials list.", zh: "下载PNG或PDF，附带完整材料清单。" },
  ];
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-[var(--surface)] border-y border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "三步完成" : "Three steps."}<br />
            <span className="text-foreground/30">{lang === "zh" ? "零学习成本。" : "Zero learning curve."}</span>
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div key={step.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="text-5xl sm:text-6xl font-bold opacity-[0.06] mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--bead-coral)" }}>{step.n}</div>
              <div className="text-3xl mb-3">{step.icon}</div>
              <p className="text-sm text-foreground/50 leading-relaxed">{lang === "zh" ? step.zh : step.en}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Simplified ──

export function CTASimplified() {
  const { t } = useLang();
  const { user, openAuth } = useAuth();
  const router = useRouter();

  const goTo = (path: string) => {
    if (!user) { openAuth(); return; }
    router.push(path);
  };

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl px-6 py-16 sm:px-12 sm:py-20 text-center"
          style={{ background: "linear-gradient(135deg, var(--bead-coral) 0%, var(--bead-amber) 50%, var(--blue-primary) 100%)" }}>
          <div className="absolute inset-0 bead-dot-bg opacity-10" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>{t("cta.title")}</h2>
            <p className="text-lg text-white/80 mb-8">{t("cta.sub")}</p>
            <button onClick={() => goTo("/generator")}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ color: "var(--bead-coral)", fontFamily: "var(--font-display)" }}>
              {t("cta.btn")} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
