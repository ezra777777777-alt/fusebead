"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, Upload, Palette, Download, Heart } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const features = [
  { icon: Upload, key: "upload" },
  { icon: Palette, key: "match" },
  { icon: Palette, key: "preview" },
  { icon: Download, key: "export" },
  { icon: Sparkles, key: "brands" },
  { icon: Heart, key: "free" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function Hero() {
  const { t } = useLang();
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bead-dot-bg opacity-[0.03]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm mb-8">
            <Sparkles className="h-4 w-4" style={{ color: "var(--bead-amber)" }} />
            <span className="text-foreground/70">{t("home.badge")}</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6" style={{ fontFamily: "var(--font-display)" }}>
            {t("home.title1")}<br />
            <span className="bead-gradient-text">{t("home.title2")}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-foreground/60 max-w-xl mb-10 leading-relaxed">{t("home.subtitle")}</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4">
            <Link href="/generator" className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
              {t("home.cta")} <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-8 py-3.5 text-base font-semibold text-foreground/80 hover:bg-[var(--surface-hover)] transition-all"
              style={{ fontFamily: "var(--font-display)" }}>{t("home.how")}</Link>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center gap-6 text-sm text-foreground/40">
            <span>✨ {t("home.stat2")}</span><span className="hidden sm:inline">•</span>
            <span>🎨 60+ {t("home.stat1")}</span><span className="hidden sm:inline">•</span>
            <span>📦 PNG + PDF</span><span className="hidden sm:inline">•</span>
            <span>🖥️ {t("home.stat3")}</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const { t } = useLang();
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {t("home.feature_title")}</h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">{t("home.feature_sub")}</p>
        </motion.div>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => (
            <motion.div key={feat.key} variants={item} className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:shadow-lg transition-all duration-300">
              <div className="inline-flex rounded-xl p-3 text-white mb-4" style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}>
                <feat.icon className="h-5 w-5" /></div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>{t(`feat.${feat.key}.title`)}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{t(`feat.${feat.key}.desc`)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function CTA() {
  const { t } = useLang();
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl px-6 py-16 sm:px-12 sm:py-20 text-center"
          style={{ background: "linear-gradient(135deg, var(--bead-coral) 0%, var(--bead-amber) 50%, var(--bead-sunflower) 100%)" }}>
          <div className="absolute inset-0 bead-dot-bg opacity-10" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>{t("cta.title")}</h2>
            <p className="text-lg text-white/80 mb-8">{t("cta.sub")}</p>
            <Link href="/generator" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold transition-all hover:scale-[1.02]" style={{ color: "var(--bead-coral)", fontFamily: "var(--font-display)" }}>
              {t("cta.btn")} <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t, lang } = useLang();
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
