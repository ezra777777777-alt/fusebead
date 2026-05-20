"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LangContext";

export default function PaymentSuccessPage() {
  const { lang } = useLang();

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 max-w-sm"
      >
        <CheckCircle2 className="h-20 w-20 mx-auto mb-6 text-green-500" />
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "支付成功！" : "Payment Successful!"}
        </h1>
        <p className="text-foreground/50 mb-8">
          {lang === "zh"
            ? "你的套餐已升级，现在可以享受所有高级功能了。"
            : "Your plan has been upgraded. Enjoy all premium features."}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
        >
          {lang === "zh" ? "前往控制台" : "Go to Dashboard"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </div>
  );
}
