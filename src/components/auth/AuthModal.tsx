"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, MessageCircle, Globe, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";

export function AuthModal() {
  const { isOpen, closeAuth, login } = useAuth();
  const { t } = useLang();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"methods" | "phone" | "wechat" | "qq">("methods");
  const [loading, setLoading] = useState(false);

  const handlePhoneNext = () => {
    if (phone.length < 10) return;
    setStep("phone");
    // TODO: Send real SMS
  };

  const handlePhoneVerify = async () => {
    if (code.length < 4) return;
    setLoading(true);
    await login("phone", phone);
    setLoading(false);
  };

  const handleOAuth = async (provider: "wechat" | "qq" | "google") => {
    setLoading(true);
    // TODO: Real OAuth redirect
    await login(provider, provider + "_user");
    setLoading(false);
  };

  const providers = [
    { id: "phone" as const, icon: Smartphone, label: "Phone", color: "text-green-500", bg: "bg-green-500/10" },
    { id: "wechat" as const, icon: MessageCircle, label: "WeChat", color: "text-green-400", bg: "bg-green-400/10" },
    { id: "qq" as const, icon: MessageCircle, label: "QQ", color: "text-blue-400", bg: "bg-blue-400/10" },
    { id: "google" as const, icon: Globe, label: "Google", color: "text-red-400", bg: "bg-red-400/10" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAuth} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 w-full max-w-sm shadow-2xl"
          >
            <button onClick={closeAuth} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--surface-hover)]">
              <X className="h-5 w-5 text-foreground/40" />
            </button>

            {/* Phone entry */}
            {step === "methods" && (
              <>
                <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Sign in to FuseBead
                </h2>
                <p className="text-sm text-foreground/50 mb-6">Save patterns, sync across devices.</p>

                {/* Phone input */}
                <div className="mb-4">
                  <label className="text-xs text-foreground/40 mb-1.5 block">Phone number</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="+86 138xxxx"
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm focus:outline-none focus:border-[var(--bead-coral)]"
                    />
                    <button
                      onClick={handlePhoneNext}
                      disabled={phone.length < 10}
                      className="rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                      style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-foreground/30">or continue with</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                {/* OAuth buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {providers.filter(p => p.id !== "phone").map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleOAuth(p.id)}
                      disabled={loading}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50`}
                    >
                      <p.icon className={`h-5 w-5 ${p.color}`} />
                      <span className="text-xs font-medium">{p.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* SMS code verification */}
            {step === "phone" && (
              <>
                <button onClick={() => setStep("methods")} className="text-sm text-foreground/40 hover:text-foreground mb-4">← Back</button>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>Enter code</h2>
                <p className="text-sm text-foreground/40 mb-6">Sent to {phone}</p>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono focus:outline-none focus:border-[var(--bead-coral)] mb-4"
                  autoFocus
                />
                <button
                  onClick={handlePhoneVerify}
                  disabled={code.length < 4 || loading}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
