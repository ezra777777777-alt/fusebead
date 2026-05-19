"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { LANGUAGES } from "@/lib/i18n";

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/generator", label: t("nav.generator") },
    { href: "/editor", label: t("nav.editor") },
    { href: "/converter", label: t("nav.converter") },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🧶</span>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              FuseBead<span className="text-[var(--bead-coral)]">.art</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                style={{ fontFamily: "var(--font-display)" }}>{link.label}</Link>
            ))}
            {/* Language toggle */}
            <button onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground transition-colors px-2 py-1 rounded-lg border border-[var(--border)]"
              title={lang === "en" ? "切换到中文" : "Switch to English"}>
              <Globe className="h-3.5 w-3.5" /> {lang === "en" ? "中文" : "EN"}
            </button>
            <Link href="/generator"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
              {t("nav.start")}
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-[var(--surface-hover)]">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)] space-y-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className="block px-2 py-2 text-sm font-medium text-foreground/70" style={{ fontFamily: "var(--font-display)" }}>{link.label}</Link>
            ))}
            <button onClick={() => { setLang(lang === "en" ? "zh" : "en"); setMobileOpen(false); }}
              className="flex items-center gap-1 text-xs text-foreground/50 px-2 py-1">
              <Globe className="h-3.5 w-3.5" /> {lang === "en" ? "切换到中文" : "Switch to English"}
            </button>
            <Link href="/generator" onClick={() => setMobileOpen(false)}
              className="block w-full text-center rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
              {t("nav.start")}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
