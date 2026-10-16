"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Grid3X3, Palette, Download, Settings, LogOut, Crown,
  Heart, Camera, X, Trash2, Receipt, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { OrderHistory } from "@/components/dashboard/OrderHistory";
import { Pagination } from "@/components/shared/Pagination";

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

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { t, lang } = useLang();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"patterns" | "favorites" | "orders">("patterns");
  const [patternPage, setPatternPage] = useState(1);
  const [favoritePage, setFavoritePage] = useState(1);
  const DASH_PAGE_SIZE = 9;

  // Real data
  const [myPatterns, setMyPatterns] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [stats, setStats] = useState({ patternCount: 0, favoriteCount: 0, totalDownloads: 0 });
  const [dataLoading, setDataLoading] = useState(false);

  const fetchData = useCallback(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      api("/user/me/stats").catch(() => ({ patternCount: 0, favoriteCount: 0, totalDownloads: 0 })),
      api("/user/me/patterns").catch(() => []),
      api("/user/me/favorites").catch(() => []),
    ]).then(([s, p, f]) => {
      setStats(s);
      setMyPatterns(p);
      setMyFavorites(f);
    }).finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeletePattern = async (patternId: number) => {
    try { await api(`/patterns/${patternId}`, { method: "DELETE" }); fetchData(); } catch { /* ignore */ }
  };

  const handlePublishDraft = async (patternId: number) => {
    try { await api(`/patterns/${patternId}/publish`, { method: "PUT" }); fetchData(); } catch { /* ignore */ }
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {t("dashboard.pleaseLogin")}
          </h1>
          <p className="text-foreground/50 mb-6">{t("dashboard.loginPrompt")}</p>
          <Link href="/" className="text-sm text-[var(--primary)] hover:underline">{t("dashboard.backHome")}</Link>
        </div>
      </div>
    );
  }

  const planLabel = user.plan === "pro" ? "Pro" : user.plan === "team" ? "Team" : lang === "zh" ? "免费版" : "Free";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-5 flex-wrap">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[var(--border)] cursor-pointer flex items-center justify-center bg-[var(--surface-hover)] text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}
                onClick={() => fileRef.current?.click()}
              >
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {avatar && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                  className="absolute -top-1 -right-1 p-1 rounded-full bg-red-400 text-white hover:bg-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* User info */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {t("dashboard.title")}, {user.username}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.plan === "pro" ? "bg-[var(--bead-coral)]/10 text-[var(--bead-coral)]" :
                  user.plan === "team" ? "bg-[var(--bead-amber)]/10 text-[var(--bead-amber)]" :
                  "bg-foreground/5 text-foreground/50"
                }`} style={{ fontFamily: "var(--font-display)" }}>
                  {planLabel}
                </span>
                <span className="text-xs text-foreground/30">·</span>
                <span className="text-xs text-foreground/30">✉️ {user.email}</span>
                {user.subscription_expires_at && user.subscription_status === "active" && (
                  <>
                    <span className="text-xs text-foreground/30">·</span>
                    <span className="text-xs text-foreground/30">
                      {t("payment.subscriptionExpires")}: {new Date(user.subscription_expires_at).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button onClick={logout} className="ml-auto flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" /> {t("dashboard.logout")}
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Grid3X3, value: String(stats.patternCount), label: t("dashboard.stats.patterns") },
            { icon: Heart, value: String(stats.favoriteCount), label: t("dashboard.stats.favorites") },
            { icon: Download, value: String(stats.totalDownloads), label: t("dashboard.stats.downloads") },
            { icon: Settings, value: planLabel, label: t("dashboard.currentPlan") },
          ].map((s) => (
            <motion.div key={s.label}
              whileHover={{ y: -2, boxShadow: "var(--card-shadow)" }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all">
              <s.icon className="h-5 w-5 text-foreground/30 mb-2" />
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              <p className="text-xs text-foreground/40 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/generator" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:bg-[var(--surface-hover)] transition-all group"
            style={{ boxShadow: "var(--card-shadow)" }}>
            <Grid3X3 className="h-6 w-6 mb-3" style={{ color: "var(--bead-coral)" }} />
            <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>{t("nav.generator")}</h3>
            <p className="text-xs text-foreground/40">{lang === "zh" ? "上传图片生成图案" : "Upload & generate patterns"}</p>
            <ArrowRight className="h-4 w-4 mt-3 text-foreground/20 group-hover:text-[var(--bead-coral)] transition-colors" />
          </Link>
          <Link href="/gallery" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:bg-[var(--surface-hover)] transition-all group"
            style={{ boxShadow: "var(--card-shadow)" }}>
            <Palette className="h-6 w-6 mb-3" style={{ color: "var(--blue-primary)" }} />
            <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>{t("nav.gallery")}</h3>
            <p className="text-xs text-foreground/40">{lang === "zh" ? "浏览社区图案" : "Browse community patterns"}</p>
            <ArrowRight className="h-4 w-4 mt-3 text-foreground/20 group-hover:text-[var(--bead-coral)] transition-colors" />
          </Link>
          {user.plan === "free" && (
            <Link href="/pricing" className="rounded-2xl border border-[var(--bead-coral)]/30 bg-[var(--bead-coral)]/[0.02] p-6 hover:bg-[var(--bead-coral)]/[0.05] transition-all group">
              <Crown className="h-6 w-6 mb-3" style={{ color: "var(--bead-coral)" }} />
              <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>{t("dashboard.upgradePro")}</h3>
              <p className="text-xs text-foreground/40">{t("dashboard.unlockAll")}</p>
              <ArrowRight className="h-4 w-4 mt-3 text-foreground/20 group-hover:text-[var(--bead-coral)] transition-colors" />
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {(["patterns", "favorites", "orders"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                activeTab === tab
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-foreground/50 hover:text-foreground"
              }`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {tab === "patterns" ? t("dashboard.myPatterns")
                : tab === "favorites" ? t("dashboard.myFavorites")
                : t("payment.orderHistory")}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {dataLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-foreground/20" /></div>
        ) : activeTab === "patterns" ? (
          myPatterns.length === 0 ? (
            <EmptyState icon={Grid3X3} message={t("dashboard.noPatterns")} action={t("dashboard.createFirst")} href="/generator" />
          ) : (
            <>
              <PatternGrid patterns={myPatterns.slice((patternPage - 1) * DASH_PAGE_SIZE, patternPage * DASH_PAGE_SIZE)} showAuthor={false} lang={lang} onDelete={handleDeletePattern} onPublish={handlePublishDraft} />
              {myPatterns.length > DASH_PAGE_SIZE && (
                <Pagination page={patternPage} totalPages={Math.ceil(myPatterns.length / DASH_PAGE_SIZE)} onChange={setPatternPage} />
              )}
            </>
          )
        ) : activeTab === "favorites" ? (
          myFavorites.length === 0 ? (
            <EmptyState icon={Heart} message={t("dashboard.noFavorites")} action={t("dashboard.browseGallery")} href="/gallery" />
          ) : (
            <>
              <PatternGrid patterns={myFavorites.slice((favoritePage - 1) * DASH_PAGE_SIZE, favoritePage * DASH_PAGE_SIZE)} showAuthor lang={lang} onCardClick={(id) => router.push(`/gallery/${id}`)} />
              {myFavorites.length > DASH_PAGE_SIZE && (
                <Pagination page={favoritePage} totalPages={Math.ceil(myFavorites.length / DASH_PAGE_SIZE)} onChange={setFavoritePage} />
              )}
            </>
          )
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              <Receipt className="h-4 w-4 inline mr-2" />
              {t("payment.orderHistory")}
            </h3>
            <OrderHistory />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper components ──

function EmptyState({ icon: Icon, message, action, href }: { icon: typeof Grid3X3; message: string; action: string; href: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
      <Icon className="h-12 w-12 mx-auto text-foreground/10 mb-4" />
      <p className="text-foreground/30 font-medium mb-3" style={{ fontFamily: "var(--font-display)" }}>
        {message}
      </p>
      <Link href={href} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
        {action} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function PatternGrid({ patterns, showAuthor, lang, onCardClick, onDelete, onPublish }: {
  patterns: any[];
  showAuthor: boolean;
  lang: string;
  onCardClick?: (id: number) => void;
  onDelete?: (id: number) => void;
  onPublish?: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {patterns.map((p) => {
        const thumb = thumbnailFromGrid(p.grid_data);
        const isDraft = p.is_public === 0 || p.is_public === false;
        return (
          <motion.div key={p.id}
            whileHover={{ y: -4, boxShadow: "var(--card-shadow)" }}
            onClick={() => onCardClick?.(p.id)}
            className={`rounded-2xl border overflow-hidden transition-all relative ${onCardClick ? "cursor-pointer" : ""} ${isDraft ? "border-dashed border-amber-300/60 bg-amber-50/[0.3]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
            {/* Draft badge */}
            {isDraft && (
              <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium z-10">
                {lang === "zh" ? "草稿" : "Draft"}
              </span>
            )}
            {/* Thumbnail */}
            <div className="aspect-video p-4 flex items-center justify-center bg-[var(--surface-hover)]">
              {thumb.length > 0 ? (
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${thumb[0].length}, 1fr)`, width: thumb[0].length * 8, height: thumb.length * 8 }}>
                  {thumb.flat().map((color, i) => (
                    <div key={i} className="rounded-sm" style={{ backgroundColor: color || "transparent" }} />
                  ))}
                </div>
              ) : (
                <Grid3X3 className="h-8 w-8 text-foreground/10" />
              )}
            </div>
            {/* Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold truncate" style={{ fontFamily: "var(--font-display)" }}>
                  {p.title}
                </h3>
                <div className="flex items-center gap-1">
                  {isDraft && onPublish && (
                    <button onClick={(e) => { e.stopPropagation(); onPublish(p.id); }} className="px-2 py-0.5 rounded-lg text-[10px] font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors">
                      {lang === "zh" ? "发布" : "Publish"}
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} className="p-1 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-foreground/20 hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
              {showAuthor && (p.author_name || p.username) && <p className="text-xs text-foreground/40 mb-2">👤 {p.author_name || p.username}</p>}
              <div className="flex items-center gap-3 text-xs text-foreground/40">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" style={{ color: "var(--bead-coral)" }} /> {p.likes_count}</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {p.downloads_count}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
