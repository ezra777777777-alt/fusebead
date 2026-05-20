"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { useLang } from "@/lib/LangContext";

export default function PaymentCancelPage() {
  const { lang } = useLang();

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 max-w-sm"
      >
        <XCircle className="h-20 w-20 mx-auto mb-6 text-gray-300" />
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "支付未完成" : "Payment Incomplete"}
        </h1>
        <p className="text-foreground/50 mb-8">
          {lang === "zh"
            ? "支付已取消或未成功，升级未生效。你可以重试或稍后再试。"
            : "Payment was cancelled or unsuccessful. Your plan has not been changed."}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
          >
            <RotateCcw className="h-4 w-4" />
            {lang === "zh" ? "重新选择套餐" : "Try Again"}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 text-sm text-foreground/40 hover:text-foreground"
          >
            {lang === "zh" ? "返回控制台" : "Back to Dashboard"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
