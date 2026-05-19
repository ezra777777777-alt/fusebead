"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, ChevronLeft } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { useAuth } from "@/lib/AuthContext";

const PLANS = [
  {
    id: "free",
    name: { en: "Free", zh: "免费版" },
    price: { en: "$0", zh: "¥0" },
    period: { en: "forever", zh: "永久免费" },
    desc: { en: "For casual crafters", zh: "适合手工爱好者" },
    features: {
      en: ["60 Perler colors", "29×29 grid", "Floyd-Steinberg dithering", "PNG export", "Basic materials list", "Community watermark"],
      zh: ["60色Perler色库", "29×29网格", "Floyd-Steinberg抖动", "PNG导出", "基础材料清单", "社区水印"],
    },
    cta: { en: "Get Started Free", zh: "免费使用" },
    highlight: false,
  },
  {
    id: "pro",
    name: { en: "Pro", zh: "专业版" },
    price: { en: "$4.99", zh: "¥29" },
    period: { en: "/month", zh: "/月" },
    desc: { en: "For serious creators", zh: "适合进阶创作" },
    features: {
      en: ["Everything in Free", "180+ colors (3 brands)", "150×150 grid", "PDF export with grid lines", "Image adjustments", "Background removal", "No watermarks", "Pattern history"],
      zh: ["免费版全部功能", "180+色（3品牌）", "150×150超大网格", "PDF导出（带网格线）", "亮度/对比度/饱和度", "背景去除", "无水印", "图案历史记录"],
    },
    cta: { en: "Start Pro Trial", zh: "免费试用7天" },
    highlight: true,
  },
  {
    id: "team",
    name: { en: "Team", zh: "团队版" },
    price: { en: "$12", zh: "¥69" },
    period: { en: "/month", zh: "/月" },
    desc: { en: "For classrooms & studios", zh: "适合教室和工作室" },
    features: {
      en: ["Everything in Pro", "5 team members", "Shared pattern library", "Priority support", "API access", "Custom branding"],
      zh: ["专业版全部功能", "5人协作", "共享图案库", "优先客服支持", "API接口", "自定义品牌"],
    },
    cta: { en: "Contact Sales", zh: "联系销售" },
    highlight: false,
  },
];

export default function PricingPage() {
  const { t, lang } = useLang();
  const { user, openAuth } = useAuth();

  return (
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-6">
            <ChevronLeft className="h-4 w-4" /> {t("common.back")}
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "zh" ? "简单定价" : "Simple Pricing"}
            </h1>
            <p className="text-foreground/50 max-w-md mx-auto">
              {lang === "zh" ? "免费开始，按需升级。随时取消。" : "Start free, upgrade when you need. Cancel anytime."}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col ${
                plan.highlight
                  ? "border-[var(--bead-coral)] bg-[var(--bead-coral)]/[0.03] shadow-lg shadow-[var(--bead-coral)]/5"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
                  {lang === "zh" ? "最受欢迎" : "Most Popular"}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>{plan.name[lang as keyof typeof plan.name] || plan.name.en}</h3>
                <p className="text-sm text-foreground/40">{plan.desc[lang as keyof typeof plan.desc] || plan.desc.en}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{plan.price[lang as keyof typeof plan.price] || plan.price.en}</span>
                <span className="text-foreground/40 text-sm ml-1">{plan.period[lang as keyof typeof plan.period] || plan.period.en}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {(plan.features[lang as keyof typeof plan.features] || plan.features.en || plan.features.en).map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/60">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--bead-mint)" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { if (!user) openAuth(); }}
                className={`w-full rounded-full py-3 text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "text-white hover:opacity-90"
                    : "border border-[var(--border)] text-foreground/70 hover:bg-[var(--surface-hover)]"
                }`}
                style={plan.highlight ? { background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" } : { fontFamily: "var(--font-display)" }}
              >
                {plan.cta[lang as keyof typeof plan.cta] || plan.cta.en}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-foreground/30">
          {lang === "zh"
            ? "所有价格均为含税价。Pro版支持7天无理由退款。"
            : "All prices include tax. 7-day money-back guarantee on Pro."}
        </div>
      </div>
    </div>
  );
}
