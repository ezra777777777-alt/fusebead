"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  plan: string;
  amount: number;
  onSelect: (provider: "alipay" | "wechat") => void;
  onClose: () => void;
  lang: string;
}

export function PaymentProviderSelector({ plan, amount, onSelect, onClose, lang }: Props) {
  const planName = plan === "pro" ? "Pro" : "Team";
  const currency = lang === "zh" ? "¥" : "¥";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl"
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>
        <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "zh" ? "选择支付方式" : "Select Payment Method"}
        </h3>
        <p className="text-sm text-gray-400 mb-5">
          {planName} — {currency}{amount}/{lang === "zh" ? "月" : "mo"}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => onSelect("alipay")}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
          >
            <span className="text-2xl">💙</span>
            <div className="text-left">
              <p className="text-sm font-semibold">{lang === "zh" ? "支付宝" : "Alipay"}</p>
              <p className="text-xs text-gray-400">{lang === "zh" ? "扫码支付" : "Scan to pay"}</p>
            </div>
          </button>
          <button
            onClick={() => onSelect("wechat")}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50/30 transition-colors"
          >
            <span className="text-2xl">💚</span>
            <div className="text-left">
              <p className="text-sm font-semibold">{lang === "zh" ? "微信支付" : "WeChat Pay"}</p>
              <p className="text-xs text-gray-400">{lang === "zh" ? "扫码支付" : "Scan to pay"}</p>
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
