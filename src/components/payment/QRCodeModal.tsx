"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  orderNo: string;
  qrCode: string;
  amount: number;
  plan: string;
  provider: string;
  simulated: boolean;
  isPolling: boolean;
  pollResult: "paid" | "pending" | null;
  onClose: () => void;
  onSimulate: (orderNo: string) => void;
  onCancel: (orderNo: string) => void;
  lang: string;
}

export function QRCodeModal({
  orderNo, qrCode, amount, plan, provider, simulated,
  isPolling, pollResult, onClose, onSimulate, onCancel, lang,
}: Props) {
  useEffect(() => {
    return () => {
      // Cleanup on unmount if not paid
    };
  }, []);

  const planName = plan === "pro" ? "Pro" : "Team";
  const providerName = provider === "alipay" ? (lang === "zh" ? "支付宝" : "Alipay") : (lang === "zh" ? "微信支付" : "WeChat Pay");
  const isSimulatedQR = qrCode.startsWith("SIMULATED_");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center"
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>

        {pollResult === "paid" ? (
          <div className="py-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "zh" ? "支付成功！" : "Payment Successful!"}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {lang === "zh" ? `已升级至 ${planName}` : `Upgraded to ${planName}`}
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
            >
              {lang === "zh" ? "开始使用" : "Start Using"}
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {providerName} {lang === "zh" ? "扫码支付" : "Scan to Pay"}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {planName} — ¥{amount}/{lang === "zh" ? "月" : "mo"}
            </p>

            {/* QR Code */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 inline-block">
              {isSimulatedQR ? (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                    <p className="text-xs text-gray-400">
                      {lang === "zh" ? "模拟模式" : "Simulated Mode"}
                    </p>
                  </div>
                </div>
              ) : (
                <QRCodeSVG value={qrCode} size={192} level="M" />
              )}
            </div>

            {isPolling && (
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--primary)] mb-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                {lang === "zh" ? "等待支付..." : "Waiting for payment..."}
              </div>
            )}

            {simulated && (
              <button
                onClick={() => onSimulate(orderNo)}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-white mb-2"
                style={{ background: "linear-gradient(135deg, #f59e0b, #eab308)" }}
              >
                {lang === "zh" ? "🔧 模拟支付（调试）" : "🔧 Simulate Payment (Dev)"}
              </button>
            )}

            <button
              onClick={() => onCancel(orderNo)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              {lang === "zh" ? "取消支付" : "Cancel"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
