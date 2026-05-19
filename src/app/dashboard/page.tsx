"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import Link from "next/link";
import { ArrowRight, Grid3X3, Palette, Download, Settings, LogOut, Crown } from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { t, lang } = useLang();

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "请先登录" : "Please sign in"}
          </h1>
          <p className="text-foreground/50 mb-6">{lang === "zh" ? "登录后查看您的图案和控制面板" : "Sign in to view your patterns and dashboard"}</p>
          <Link href="/" className="text-sm text-[var(--bead-coral)] hover:underline">{lang === "zh" ? "返回首页" : "Back to home"}</Link>
        </div>
      </div>
    );
  }

  const planLabel = user.plan === "pro" ? "Pro" : user.plan === "team" ? "Team" : lang === "zh" ? "免费版" : "Free";

  return (
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {lang === "zh" ? `欢迎, ${user.name}` : `Welcome, ${user.name}`}
              </h1>
              <div className="flex items-center gap-2 mt-1">
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
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" /> {lang === "zh" ? "退出" : "Logout"}
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Grid3X3, value: "0", label: lang === "zh" ? "已保存图案" : "Saved Patterns" },
            { icon: Palette, value: user.plan === "free" ? "60" : "180", label: lang === "zh" ? "可用颜色" : "Colors" },
            { icon: Download, value: "0", label: lang === "zh" ? "本月导出" : "Exports This Month" },
            { icon: Settings, value: planLabel, label: lang === "zh" ? "当前套餐" : "Current Plan" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <s.icon className="h-5 w-5 text-foreground/30 mb-2" />
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
              <p className="text-xs text-foreground/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/generator" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:bg-[var(--surface-hover)] transition-all group">
            <Grid3X3 className="h-6 w-6 mb-3" style={{ color: "var(--bead-coral)" }} />
            <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>{t("nav.generator")}</h3>
            <p className="text-xs text-foreground/40">{lang === "zh" ? "上传图片生成图案" : "Upload & generate patterns"}</p>
            <ArrowRight className="h-4 w-4 mt-3 text-foreground/20 group-hover:text-[var(--bead-coral)] transition-colors" />
          </Link>
          <Link href="/editor" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:bg-[var(--surface-hover)] transition-all group">
            <Palette className="h-6 w-6 mb-3" style={{ color: "var(--bead-amber)" }} />
            <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>{t("nav.editor")}</h3>
            <p className="text-xs text-foreground/40">{lang === "zh" ? "自由绘制图案" : "Draw your own pattern"}</p>
            <ArrowRight className="h-4 w-4 mt-3 text-foreground/20 group-hover:text-[var(--bead-coral)] transition-colors" />
          </Link>
          {user.plan === "free" && (
            <Link href="/pricing" className="rounded-2xl border border-[var(--bead-coral)]/30 bg-[var(--bead-coral)]/[0.02] p-6 hover:bg-[var(--bead-coral)]/[0.05] transition-all group">
              <Crown className="h-6 w-6 mb-3" style={{ color: "var(--bead-coral)" }} />
              <h3 className="font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>{lang === "zh" ? "升级Pro" : "Upgrade to Pro"}</h3>
              <p className="text-xs text-foreground/40">{lang === "zh" ? "解锁全部功能" : "Unlock all features"}</p>
              <ArrowRight className="h-4 w-4 mt-3 text-foreground/20 group-hover:text-[var(--bead-coral)] transition-colors" />
            </Link>
          )}
        </div>

        {/* Saved Patterns (empty state) */}
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <Grid3X3 className="h-12 w-12 mx-auto text-foreground/10 mb-4" />
          <p className="text-foreground/30 font-medium mb-1" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "还没有保存的图案" : "No saved patterns yet"}
          </p>
          <p className="text-sm text-foreground/20">
            {lang === "zh" ? "去生成器创建你的第一幅拼豆图案" : "Create your first pattern in the generator"}
          </p>
        </div>
      </div>
    </div>
  );
}
