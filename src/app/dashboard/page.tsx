"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Grid3X3, Palette, Download, Settings, LogOut, Crown,
  Heart, Camera, X, Trash2,
} from "lucide-react";

// Mock pattern data for user's own patterns
const MOCK_MY_PATTERNS = [
  { id: "a1", title: { en: "My Cat", zh: "我的小猫" }, likes: 12, downloads: 5, createdAt: "2026-05-19",
    thumbnail: [["#FFD1DC","","#5D4E5D","#5D4E5D","","#FFD1DC"],["","#FFE082","#FFD1DC","#FFD1DC","#FFE082",""],["","#FFD1DC","#87CEEB","#87CEEB","#FFD1DC",""],["","","#FF9EB5","#FF9EB5","","",""]] },
  { id: "a2", title: { en: "Rainbow Heart", zh: "彩虹心" }, likes: 8, downloads: 3, createdAt: "2026-05-18",
    thumbnail: [["","#FF9EB5","","","","#FF9EB5",""],["#FF9EB5","#FFD1DC","#FFE082","#FFE082","#FFD1DC","#FF9EB5",""],["","#FFD1DC","#87CEEB","#87CEEB","#FFD1DC","",""],["","","#D4B8E0","#D4B8E0","","",""]] },
  { id: "a3", title: { en: "Happy Star", zh: "开心星" }, likes: 15, downloads: 7, createdAt: "2026-05-17",
    thumbnail: [["","","#FFE082","#FFE082","","",""],["","#FFE082","#FFE082","#FFE082","#FFE082","",""],["#FFE082","#FFE082","#FF9EB5","#FF9EB5","#FFE082","#FFE082",""],["","#FFE082","#FFE082","#FFE082","#FFE082","",""],["","","#FFE082","#FFE082","","",""]] },
  { id: "a4", title: { en: "Blue Whale", zh: "蓝鲸" }, likes: 20, downloads: 11, createdAt: "2026-05-16",
    thumbnail: [["","","#87CEEB","#87CEEB","","",""],["","#87CEEB","#B8E4F0","#B8E4F0","#87CEEB","",""],["#87CEEB","#B8E4F0","#87CEEB","#87CEEB","#B8E4F0","#87CEEB",""],["","#87CEEB","#B8E4F0","#B8E4F0","#87CEEB","",""],["","","#87CEEB","#87CEEB","","",""]] },
];

const MOCK_MY_FAVORITES = [
  { id: "3", title: { en: "Sakura", zh: "樱花" }, author: "SakuraArt", likes: 89, downloads: 34,
    thumbnail: [["","#FF9EB5","","","#FF9EB5",""],["#FF9EB5","#FFD1DC","#FF9EB5","#FF9EB5","#FFD1DC","#FF9EB5"],["","","#87CEEB","#87CEEB","",""],["","#B8E4F0","","#FF9EB5","","#B8E4F0",""]] },
  { id: "2", title: { en: "Pikachu", zh: "皮卡丘" }, author: "PikaFan", likes: 456, downloads: 167,
    thumbnail: [["","#FFE082","#FFE082","#FFE082","#FFE082",""],["#FFE082","#5D4E5D","#FFE082","#FFE082","#5D4E5D","#FFE082"],["#FFE082","#FFE082","#D4B8E0","#D4B8E0","#FFE082","#FFE082"],["","#FFE082","#FFE082","#FFE082","#FFE082",""]] },
  { id: "6", title: { en: "Unicorn", zh: "独角兽" }, author: "MagicBead", likes: 523, downloads: 201,
    thumbnail: [["","","#FFD1DC","#FFD1DC","",""],["","#FFD1DC","#FFD1DC","#FFD1DC","#FFD1DC",""],["#D4B8E0","#FFD1DC","#FFD1DC","#FFD1DC","#FFD1DC","#D4B8E0"],["","","#FF9EB5","#87CEEB","",""]] },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { t, lang } = useLang();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"patterns" | "favorites">("patterns");

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
                  user.name.charAt(0).toUpperCase()
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
                {t("dashboard.title")}, {user.name}
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
                <span className="text-xs text-foreground/30">
                  {user.provider === "phone" ? "📱" : user.provider === "wechat" ? "💬" : user.provider === "qq" ? "🐧" : "🔵"}
                  {" "}{user.provider}
                </span>
                <span className="text-xs text-foreground/30">·</span>
                <span className="text-xs text-foreground/30">{t("dashboard.memberSince")} 2026</span>
              </div>
            </div>

            <button onClick={logout} className="ml-auto flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" /> {lang === "zh" ? "退出" : "Logout"}
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Grid3X3, value: String(MOCK_MY_PATTERNS.length), label: t("dashboard.stats.patterns") },
            { icon: Heart, value: String(MOCK_MY_FAVORITES.length), label: t("dashboard.stats.favorites") },
            { icon: Download, value: "26", label: t("dashboard.stats.downloads") },
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
          {(["patterns", "favorites"] as const).map((tab) => (
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
              {tab === "patterns" ? t("dashboard.myPatterns") : t("dashboard.myFavorites")}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "patterns" ? (
          MOCK_MY_PATTERNS.length === 0 ? (
            <EmptyState icon={Grid3X3} message={t("dashboard.noPatterns")} action={t("dashboard.createFirst")} href="/generator" />
          ) : (
            <PatternGrid patterns={MOCK_MY_PATTERNS} showAuthor={false} lang={lang} />
          )
        ) : (
          MOCK_MY_FAVORITES.length === 0 ? (
            <EmptyState icon={Heart} message={t("dashboard.noFavorites")} action={t("dashboard.browseGallery")} href="/gallery" />
          ) : (
            <PatternGrid patterns={MOCK_MY_FAVORITES} showAuthor lang={lang} onCardClick={(id) => router.push(`/gallery/${id}`)} />
          )
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

function PatternGrid({ patterns, showAuthor, lang, onCardClick }: {
  patterns: { id: string; title: { en: string; zh: string }; author?: string; likes: number; downloads: number; thumbnail: string[][] }[];
  showAuthor: boolean;
  lang: string;
  onCardClick?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {patterns.map((p) => (
        <motion.div key={p.id}
          whileHover={{ y: -4, boxShadow: "var(--card-shadow)" }}
          onClick={() => onCardClick?.(p.id)}
          className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all ${onCardClick ? "cursor-pointer" : ""}`}>
          {/* Thumbnail */}
          <div className="aspect-video p-4 flex items-center justify-center bg-[var(--surface-hover)]">
            <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${p.thumbnail[0].length}, 1fr)`, width: p.thumbnail[0].length * 8, height: p.thumbnail.length * 8 }}>
              {p.thumbnail.flat().map((color, i) => (
                <div key={i} className="rounded-sm" style={{ backgroundColor: color || "transparent" }} />
              ))}
            </div>
          </div>
          {/* Info */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold truncate" style={{ fontFamily: "var(--font-display)" }}>
                {lang === "zh" ? p.title.zh : p.title.en}
              </h3>
              <button className="p-1 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5 text-foreground/20 hover:text-red-400" />
              </button>
            </div>
            {showAuthor && p.author && <p className="text-xs text-foreground/40 mb-2">👤 {p.author}</p>}
            <div className="flex items-center gap-3 text-xs text-foreground/40">
              <span className="flex items-center gap-1"><Heart className="h-3 w-3" style={{ color: "var(--bead-coral)" }} /> {p.likes}</span>
              <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {p.downloads}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
