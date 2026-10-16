"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";

export function FeedbackButton() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState({ captchaId: "", svgBase64: "" });
  const [captchaText, setCaptchaText] = useState("");
  const [error, setError] = useState("");

  const refreshCaptcha = async () => {
    setCaptchaText("");
    try { setCaptcha(await api("/auth/captcha")); } catch { setError("验证码加载失败，请重试"); }
  };
  const handleClick = () => {
    if (!user) refreshCaptcha();
    setOpen(true);
    setSent(false);
    setError("");
    setSubject("");
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if ((user && !subject.trim()) || !message.trim() || (!user && (!email || !captchaText))) {
      setError(lang === "zh" ? "请填写主题和内容" : "Please fill in subject and message");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api(user ? "/user/feedback" : "/user/appeal", {
        method: "POST",
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), email, captchaId: captcha.captchaId, captchaText }),
      });
      setSent(true);
    } catch (e) {
      if (!user) refreshCaptcha();
      setError(e instanceof Error ? e.message : (lang === "zh" ? "发送失败，请重试" : "Failed to send, please retry"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleClick}
        aria-label="反馈与账号申诉"
        className="fixed bottom-20 md:bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
        title={lang === "zh" ? "反馈" : "Feedback"}
      >
        <Mail className="h-5 w-5 text-white" />
      </button>

      {/* Feedback modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="relative max-h-[90dvh] overflow-y-auto bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <button aria-label="关闭反馈" onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-400" />
              </button>

              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    {user ? (lang === "zh" ? "反馈已发送" : "Feedback Sent") : "申诉已提交"}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {user ? (lang === "zh" ? "感谢你的反馈！" : "Thanks for your feedback!") : "管理员将核实账号情况；提交申诉不会自动解封。"}
                  </p>
                  {user && <Link href="/dashboard?tab=feedback" onClick={() => setOpen(false)} className="mt-5 inline-block font-bold underline">查看我的反馈与回复</Link>}
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {user ? "反馈与建议" : "账号申诉 / 数据请求"}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {lang === "zh" ? "告诉我们你的想法或遇到的问题" : "Tell us what you think or report an issue"}
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {!user && <div className="space-y-3"><p className="text-xs text-black/60">填写注册邮箱和问题说明。提交后不会自动解封，管理员需核实身份；请勿填写密码。</p><input aria-label="注册邮箱" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="注册邮箱" className="cyber-input" /><div className="flex items-center gap-2">{captcha.svgBase64 && <img alt="图形验证码" src={`data:image/svg+xml;base64,${captcha.svgBase64}`} className="h-10" />}<button type="button" onClick={refreshCaptcha} className="text-xs underline">刷新验证码</button></div><input aria-label="申诉验证码" required value={captchaText} onChange={e => setCaptchaText(e.target.value)} placeholder="图形验证码" className="cyber-input" /></div>}
                    <input
                      aria-label="反馈主题"
                      hidden={!user}
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={lang === "zh" ? "主题" : "Subject"}
                      maxLength={200}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                    <textarea
                      aria-label="反馈或申诉内容"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={lang === "zh" ? "详细描述..." : "Describe in detail..."}
                      maxLength={2000}
                      rows={4}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
                    />
                    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Send className="h-4 w-4" />
                      {lang === "zh" ? "发送" : "Send"}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
