"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import {
  LayoutDashboard, Users, Grid3X3, MessageSquare, Star, Settings, FileText, Mail,
  ArrowLeft, Menu, X, Loader2,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", icon: LayoutDashboard, en: "Dashboard", zh: "仪表盘" },
  { href: "/admin/users", icon: Users, en: "Users", zh: "用户管理" },
  { href: "/admin/patterns", icon: Grid3X3, en: "Patterns", zh: "图案审核" },
  { href: "/admin/comments", icon: MessageSquare, en: "Comments", zh: "评论管理" },
  { href: "/admin/featured", icon: Star, en: "Featured", zh: "首页推荐" },
  { href: "/admin/settings", icon: Settings, en: "Settings", zh: "系统设置" },
  { href: "/admin/feedback", icon: Mail, en: "Feedback", zh: "用户反馈" },
  { href: "/admin/logs", icon: FileText, en: "Logs", zh: "操作日志" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const { lang } = useLang();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center px-4">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "无权访问" : "Access Denied"}
          </h1>
          <p className="text-foreground/50 mb-6">
            {lang === "zh" ? "此页面仅限管理员访问" : "This page is restricted to administrators"}
          </p>
          <Link href="/" className="text-sm text-[var(--primary)] hover:underline">
            {lang === "zh" ? "返回首页" : "Back to home"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-60 bg-white border-r border-[var(--border)] transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--border)]">
          <Link href="/admin" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <span className="text-lg">🧩</span>
            <span className="font-bold text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}>
              {lang === "zh" ? "管理后台" : "Admin Panel"}
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-[var(--surface-hover)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-foreground/60 hover:text-foreground hover:bg-[var(--surface-hover)]"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {lang === "zh" ? link.zh : link.en}
              </Link>
            );
          })}

          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/40 hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors mt-4 border-t border-[var(--border)] pt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {lang === "zh" ? "返回网站" : "Back to site"}
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-[var(--border)] bg-white/80 backdrop-blur-lg flex items-center justify-between px-5">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--surface-hover)]">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm text-foreground/40 lg:hidden" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "管理后台" : "Admin"}
          </span>
          <span className="text-xs text-foreground/40 ml-auto">
            {user?.username}
          </span>
        </header>

        <main className="p-5 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
