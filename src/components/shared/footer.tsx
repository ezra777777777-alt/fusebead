"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useLang } from "@/lib/LangContext";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span className="text-xl">🧩</span>
              <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}>FuseBead<span className="text-foreground">.art</span></span>
            </Link>
            <p className="text-sm text-foreground/50 leading-relaxed">{t("footer.desc")}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>{t("footer.tools")}</h4>
            <div className="space-y-2">
              <Link href="/generator" className="block text-sm text-foreground/60 hover:text-foreground">{t("nav.generator")}</Link>
              <Link href="/editor" className="block text-sm text-foreground/60 hover:text-foreground">{t("nav.editor")}</Link>
              <Link href="/converter" className="block text-sm text-foreground/60 hover:text-foreground">{t("nav.converter")}</Link>
              <Link href="/gallery" className="block text-sm text-foreground/60 hover:text-foreground">{t("nav.gallery")}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>{t("footer.about")}</h4>
            <p className="text-sm text-foreground/50 leading-relaxed">{t("footer.aboutText")}</p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground/40">&copy; {new Date().getFullYear()} FuseBead.art — {t("footer.copyright")}</p>
          <p className="text-xs text-foreground/40 flex items-center gap-1">{t("footer.made")} <Heart className="h-3 w-3" style={{ color: "var(--bead-coral)" }} /></p>
        </div>
      </div>
    </footer>
  );
}
