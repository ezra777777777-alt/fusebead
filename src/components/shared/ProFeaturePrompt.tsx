"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/LangContext";

export function ProFeaturePrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const router = useRouter();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--surface-hover)]">
              <X className="h-4 w-4 text-foreground/30" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-9 h-9 rounded-full"
                style={{ background: "linear-gradient(135deg, #f59e0b, #eab308)" }}>
                <Crown className="h-4 w-4 text-white" />
              </span>
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{t("pro.title")}</h3>
            </div>
            <p className="text-sm text-foreground/50 mb-6 leading-relaxed">{t("pro.desc")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => { onClose(); router.push("/pricing"); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #f59e0b, #eab308)", fontFamily: "var(--font-display)" }}
              >
                {t("pro.upgrade")} <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-foreground/40 hover:text-foreground rounded-full border border-[var(--border)]"
              >
                {t("pro.later")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
