"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Grid3X3 } from "lucide-react";
import { useLang } from "@/lib/LangContext";

export default function NotFound() {
  const { lang } = useLang();

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-4 max-w-sm"
      >
        <Grid3X3 className="h-16 w-16 mx-auto mb-6 text-foreground/10" />
        <h1 className="text-6xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}>
          404
        </h1>
        <p className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "页面未找到" : "Page not found"}
        </p>
        <p className="text-sm text-foreground/50 mb-8">
          {lang === "zh"
            ? "你访问的页面不存在或已被移除。"
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === "zh" ? "返回首页" : "Back to Home"}
        </Link>
      </motion.div>
    </div>
  );
}
