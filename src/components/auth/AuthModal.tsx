"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Loader2, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { api, ApiError } from "@/lib/api";

type Mode = "form" | "verify" | "forgot" | "reset";

export function AuthModal() {
  const { isOpen, closeAuth, pendingEmail, verificationMessage, login, register, verifyEmail, sendCode, clearPendingEmail } = useAuth();
  const { lang } = useLang();

  // Mode
  const [mode, setMode] = useState<Mode>("form");

  // Form state
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirm, setConfirm] = useState("");

  // CAPTCHA state (form)
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaText, setCaptchaText] = useState("");

  // Verify state
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showResendCaptcha, setShowResendCaptcha] = useState(false);
  const [resendCaptchaId, setResendCaptchaId] = useState("");
  const [resendCaptchaSvg, setResendCaptchaSvg] = useState("");
  const [resendCaptchaText, setResendCaptchaText] = useState("");

  // Shared
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch CAPTCHA for form
  const fetchCaptcha = useCallback(async () => {
    try {
      const data = await api<{ captchaId: string; svgBase64: string }>("/auth/captcha");
      setCaptchaId(data.captchaId);
      setCaptchaSvg(data.svgBase64);
      setCaptchaText("");
    } catch {
      setError("验证码加载失败，请点击刷新重试");
    }
  }, []);

  // Fetch CAPTCHA for resend
  const fetchResendCaptcha = useCallback(async () => {
    try {
      const data = await api<{ captchaId: string; svgBase64: string }>("/auth/captcha");
      setResendCaptchaId(data.captchaId);
      setResendCaptchaSvg(data.svgBase64);
      setResendCaptchaText("");
    } catch {
      setError("验证码加载失败，请点击刷新重试");
    }
  }, []);

  // Fetch CAPTCHA when modal opens or mode changes to form
  useEffect(() => {
    if (isOpen && mode === "form") {
      fetchCaptcha();
    }
  }, [isOpen, mode, fetchCaptcha]);

  // Switch to verify mode when pendingEmail is set
  useEffect(() => {
    if (pendingEmail) {
      setMode("verify");
      setCode("");
      setError("");
      setShowResendCaptcha(false);
      setResendCooldown(0);
    }
  }, [pendingEmail]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [resendCooldown]);

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setAcceptedTerms(false);
    setCaptchaText("");
    setError("");
  };

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    resetForm();
    fetchCaptcha();
  };

  const handleClose = () => {
    clearPendingEmail();
    setMode("form");
    resetForm();
    setCode("");
    setResendCooldown(0);
    setShowResendCaptcha(false);
    setForgotEmail("");
    setForgotSent(false);
    setResetPassword("");
    setResetConfirm("");
    setResetDone(false);
    closeAuth();
  };

  const validateForm = (): string | null => {
    if (!email.includes("@") || !email.includes(".")) {
      return lang === "zh" ? "请输入有效的邮箱地址" : "Please enter a valid email";
    }
    if (tab === "register" && (password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      return lang === "zh" ? "密码至少 8 位，最多 72 字节（中文占多个字节）" : "Use at least 8 characters and at most 72 bytes";
    }
    if (tab === "login" && !password) return lang === "zh" ? "请输入密码" : "Enter your password";
    if (tab === "register" && password !== confirm) {
      return lang === "zh" ? "两次密码不一致" : "Passwords do not match";
    }
    if (tab === "register" && !acceptedTerms) return "请阅读并同意用户协议和隐私政策";
    if (tab === "register" && (username.trim().length < 2 || username.length > 40)) {
      return lang === "zh" ? "昵称需 2–40 字" : "Please enter a username";
    }
    if (!captchaText.trim()) {
      return lang === "zh" ? "请输入验证码" : "Please enter the CAPTCHA code";
    }
    return null;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    try {
      if (tab === "login") {
        await login(email, password, captchaId, captchaText);
        // If we get here, login succeeded (no 403) — modal closes via setAuth
      } else {
        await register(username.trim(), email, password, captchaId, captchaText);
        // pendingEmail is now set → useEffect switches to verify mode
      }
      resetForm();
    } catch (err: any) {
      const msg = err instanceof ApiError
        ? err.message
        : (lang === "zh" ? "操作失败，请重试" : "Failed, please retry");
      setError(msg);
      // Fetch new CAPTCHA on failure since the old one may have been consumed
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      setError(lang === "zh" ? "请输入6位验证码" : "Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyEmail(pendingEmail!, code);
      setMode("form"); setTab("login"); setCode(""); resetForm();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (lang === "zh" ? "验证码错误或已过期" : "Invalid or expired verification code"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    if (!showResendCaptcha) {
      setShowResendCaptcha(true);
      fetchResendCaptcha();
      return;
    }

    if (!resendCaptchaText.trim()) {
      setError(lang === "zh" ? "请输入验证码" : "Please enter the CAPTCHA code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendCode(pendingEmail!, resendCaptchaId, resendCaptchaText);
      setShowResendCaptcha(false);
      setResendCaptchaText("");
      setResendCooldown(60);
      setError("");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (lang === "zh" ? "发送失败" : "Failed to send"));
      fetchResendCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    clearPendingEmail();
    setTab("login");
    setMode("form");
    resetForm();
    setForgotSent(false); setResetPassword(""); setResetConfirm(""); setResetDone(false);
    setCode("");
    setResendCooldown(0);
    setShowResendCaptcha(false);
    fetchCaptcha();
  };

  // ── Forgot / Reset password ──
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetDone, setResetDone] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.includes("@")) {
      setError(lang === "zh" ? "请输入有效的邮箱地址" : "Please enter a valid email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: forgotEmail }) });
      setForgotSent(true);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (lang === "zh" ? "发送失败" : "Failed to send"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      setError(lang === "zh" ? "请输入6位验证码" : "Please enter the 6-digit code");
      return;
    }
    if (resetPassword.length < 8 || new TextEncoder().encode(resetPassword).length > 72) {
      setError(lang === "zh" ? "密码至少 8 位，最多 72 字节（中文占多个字节）" : "Use at least 8 characters and at most 72 bytes");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setError(lang === "zh" ? "两次密码不一致" : "Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail, code, password: resetPassword }),
      });
      setResetDone(true);
      setResetPassword(""); setResetConfirm(""); setCode("");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : (lang === "zh" ? "重置失败" : "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  const switchToForgot = () => {
    setMode("forgot");
    setForgotEmail("");
    setForgotSent(false);
    setError("");
    setCode("");
    setResetPassword("");
    setResetConfirm("");
    setResetDone(false);
  };

  const l = (key: string, vars?: Record<string, string>) => {
    // Look up from the shared T record — we import these keys indirectly via hardcoded bilingual pairs
    const dict: Record<string, Record<string, string>> = {
      "auth.captchaPlaceholder": { en: "Enter CAPTCHA code", zh: "输入验证码" },
      "auth.captchaRefresh": { en: "Refresh", zh: "换一张" },
      "auth.verifyTitle": { en: "Verify Your Email", zh: "验证邮箱" },
      "auth.verifyDesc": { en: "Verify the email address", zh: "待验证邮箱：" },
      "auth.verifyCodePlaceholder": { en: "Enter 6-digit code", zh: "输入6位验证码" },
      "auth.verifyBtn": { en: "Verify", zh: "验证" },
      "auth.verifyResend": { en: "Resend Code", zh: "重新发送" },
      "auth.backToLogin": { en: "Back to sign in", zh: "返回登录" },
      "auth.verifySent": { en: "Send code", zh: "发送验证码" },
      "auth.resendCooldown": { en: "Resend in {s}s", zh: "{s}秒后重发" },
    };
    const entry = dict[key];
    if (!entry) return key;
    let text = entry[lang] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
    }
    return text;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/80" onClick={handleClose} />
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 12 }}
            className="cyber-paper relative w-full max-w-sm max-h-[90vh] overflow-y-auto border-4 border-black p-6 shadow-[8px_8px_0_var(--orange)] sm:p-8"
          >
            <button aria-label="关闭登录窗口" onClick={handleClose} className="absolute top-3 right-3 border-2 border-black bg-black p-1 text-[var(--acid)]">
              <X className="h-5 w-5" />
            </button>

            {mode === "form" && (
              <>
                <p className="text-xs font-black tracking-[0.18em] text-[var(--orange)]">ACCESS GATE · 登录口</p>
                <h2 className="mb-1 mt-2 text-2xl font-black">
                  {lang === "zh" ? "先登录，再往里看。" : "Sign in to continue"}
                </h2>
                <p className="mb-5 text-sm font-semibold text-black/60">
                  {lang === "zh" ? "作品、资源和帖子需要登录。注册和验证码就在这里。" : "Works, resources and posts require a login."}
                </p>

                {/* Tabs */}
                <div className="mb-5 flex gap-2">
                  {(["login", "register"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => switchTab(t)}
                      className={`flex-1 border-2 border-black py-2 text-sm font-black ${
                        tab === t
                          ? "bg-black text-[var(--acid)]"
                          : "bg-[#fffdf8] text-black"
                      }`}
                    >
                      {t === "login" ? (lang === "zh" ? "登录" : "Login") : (lang === "zh" ? "注册" : "Register")}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {tab === "register" && (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={lang === "zh" ? "用户名" : "Username"}
                        className="cyber-input with-icon"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                      className="cyber-input with-icon"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={lang === "zh" ? "密码" : "Password"}
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                      className="cyber-input with-icon"
                    />
                  </div>

                  {tab === "register" && (
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                      <input
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder={lang === "zh" ? "确认密码" : "Confirm password"}
                        autoComplete="new-password"
                        className="cyber-input with-icon"
                      />
                    </div>
                  )}

                  {/* CAPTCHA */}
                  <div className="space-y-2">
                    <div className="flex gap-2 items-stretch">
                      <div className="relative flex-1 overflow-hidden border-2 border-black bg-[#fffdf8]" style={{ minHeight: 48 }}>
                        {captchaSvg ? (
                          <img
                            src={`data:image/svg+xml;base64,${captchaSvg}`}
                            alt="CAPTCHA"
                            className="w-full h-full object-contain bg-white"
                            style={{ imageRendering: "auto" }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={fetchCaptcha}
                        className="flex items-center justify-center border-2 border-black bg-[#fffdf8] px-3"
                        title={l("auth.captchaRefresh")}
                      >
                        <RefreshCw className="h-4 w-4 text-foreground/40" />
                      </button>
                    </div>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                      <input
                        type="text"
                        value={captchaText}
                        onChange={(e) => setCaptchaText(e.target.value.toUpperCase())}
                        placeholder={l("auth.captchaPlaceholder")}
                        maxLength={4}
                        autoComplete="off"
                        className="cyber-input with-icon font-mono uppercase tracking-widest"
                      />
                    </div>
                  </div>

                  {tab === "register" && <label className="flex items-start gap-2 text-xs leading-6"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1.5" /><span>我已阅读并同意 <Link href="/terms" target="_blank" className="underline">用户协议</Link> 和 <Link href="/privacy" target="_blank" className="underline">隐私政策</Link></span></label>}
                  {error && (
                    <p className="text-xs text-red-400 text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="cyber-button w-full bg-[var(--orange)] text-white disabled:opacity-60"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {tab === "login"
                      ? (lang === "zh" ? "登录" : "Sign In")
                      : (lang === "zh" ? "注册" : "Create Account")}
                  </button>

                  {tab === "login" && (
                    <button type="button" onClick={switchToForgot}
                      className="w-full text-xs text-foreground/40 hover:text-[var(--primary)] transition-colors">
                      {lang === "zh" ? "忘记密码？" : "Forgot password?"}
                    </button>
                  )}
                </form>
              </>
            )}

            {mode === "verify" && (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border-2 border-black bg-[var(--acid)]">
                    <Mail className="h-6 w-6 text-black" />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {l("auth.verifyTitle")}
                  </h2>
                  <p className="text-sm text-foreground/50">
                    {l("auth.verifyDesc")}{" "}
                    <span className="font-medium text-foreground">{pendingEmail}</span>
                  </p>
                  <p role="status" className="mt-2 text-sm text-foreground/70">{verificationMessage}</p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setCode(v);
                      }}
                      placeholder={l("auth.verifyCodePlaceholder")}
                      maxLength={6}
                      autoComplete="one-time-code"
                      className="cyber-input text-center font-mono text-lg tracking-[0.3em]"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="cyber-button w-full bg-[var(--orange)] text-white disabled:opacity-60"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {l("auth.verifyBtn")}
                  </button>
                </form>

                {/* Resend section */}
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  {!showResendCaptcha ? (
                    <button
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="w-full text-sm text-foreground/50 hover:text-[var(--primary)] disabled:text-foreground/30 transition-colors"
                    >
                      {resendCooldown > 0
                        ? l("auth.resendCooldown", { s: String(resendCooldown) })
                        : l("auth.verifyResend")}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2 items-stretch">
                        <div className="relative flex-1 overflow-hidden border-2 border-black bg-[#fffdf8]" style={{ minHeight: 40 }}>
                          {resendCaptchaSvg ? (
                            <img
                              src={`data:image/svg+xml;base64,${resendCaptchaSvg}`}
                              alt="CAPTCHA"
                              className="w-full h-full object-contain bg-white"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Loader2 className="h-3 w-3 animate-spin text-foreground/30" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={fetchResendCaptcha}
                          className="border-2 border-black bg-[#fffdf8] px-3"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-foreground/40" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={resendCaptchaText}
                          onChange={(e) => setResendCaptchaText(e.target.value.toUpperCase())}
                          placeholder={l("auth.captchaPlaceholder")}
                          maxLength={4}
                          autoComplete="off"
                          className="cyber-input font-mono uppercase tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={loading || !resendCaptchaText.trim()}
                          className="cyber-button bg-[var(--orange)] px-4 text-white disabled:opacity-60"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : l("auth.verifySent")}
                        </button>
                      </div>
                      <button
                        onClick={() => { setShowResendCaptcha(false); setResendCaptchaText(""); }}
                        className="w-full text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
                      >
                        {lang === "zh" ? "取消" : "Cancel"}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleBackToLogin}
                  className="w-full mt-4 text-sm text-foreground/50 hover:text-[var(--primary)] transition-colors"
                >
                  ← {l("auth.backToLogin")}
                </button>
              </>
            )}

            {mode === "forgot" && (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border-2 border-black bg-[var(--orange)] text-white">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {lang === "zh" ? "忘记密码" : "Forgot Password"}
                  </h2>
                  <p className="text-sm text-foreground/50">
                    {lang === "zh" ? "输入注册邮箱，我们将发送重置验证码" : "Enter your email and we'll send a reset code"}
                  </p>
                </div>

                {!forgotSent ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Email"
                        autoComplete="email"
                        className="cyber-input with-icon"
                      />
                    </div>
                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="cyber-button w-full bg-[var(--orange)] text-white disabled:opacity-60"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {lang === "zh" ? "发送验证码" : "Send Code"}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-green-500">
                      {lang === "zh" ? "如果该邮箱已注册且可正常收信，将收到重置验证码。请同时检查垃圾邮件。" : "If the account exists and email can be delivered, a reset code will arrive. Check your spam folder too."}
                    </p>
                    <button
                      onClick={() => { setMode("reset"); setCode(""); setResetPassword(""); setResetConfirm(""); setResetDone(false); setError(""); }}
                      className="cyber-button w-full bg-[var(--acid)] text-black"
                    >
                      {lang === "zh" ? "下一步：重置密码" : "Next: Reset Password"}
                    </button>
                  </div>
                )}

                <button
                  onClick={handleBackToLogin}
                  className="w-full mt-4 text-sm text-foreground/50 hover:text-[var(--primary)] transition-colors"
                >
                  ← {l("auth.backToLogin")}
                </button>
              </>
            )}

            {mode === "reset" && (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-[var(--acid)]">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {lang === "zh" ? "重置密码" : "Reset Password"}
                  </h2>
                  <p className="text-sm text-foreground/50">
                    {lang === "zh" ? `请输入 ${forgotEmail} 收到的验证码` : `Enter the code received at ${forgotEmail}`}
                  </p>
                </div>

                {resetDone ? (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-green-500">
                      {lang === "zh" ? "密码重置成功！" : "Password reset successfully!"}
                    </p>
                    <button
                      onClick={handleBackToLogin}
                      className="cyber-button w-full bg-[var(--acid)] text-black"
                    >
                      {lang === "zh" ? "返回登录" : "Back to Sign In"}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); }}
                        placeholder={lang === "zh" ? "输入6位验证码" : "Enter 6-digit code"}
                        maxLength={6}
                        autoComplete="one-time-code"
                        className="cyber-input text-center font-mono text-lg tracking-[0.3em]"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder={lang === "zh" ? "新密码" : "New password"}
                        autoComplete="new-password"
                        className="cyber-input with-icon"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                      <input
                        type="password"
                        value={resetConfirm}
                        onChange={(e) => setResetConfirm(e.target.value)}
                        placeholder={lang === "zh" ? "确认新密码" : "Confirm new password"}
                        autoComplete="new-password"
                        className="cyber-input with-icon"
                      />
                    </div>
                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="cyber-button w-full bg-[var(--orange)] text-white disabled:opacity-60"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {lang === "zh" ? "重置密码" : "Reset Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setForgotSent(false); setError(""); setCode(""); setResetPassword(""); setResetConfirm(""); }}
                      className="w-full text-xs text-foreground/40 hover:text-[var(--primary)] transition-colors"
                    >
                      {lang === "zh" ? "重新发送验证码" : "Resend code"}
                    </button>
                  </form>
                )}

                {!resetDone && (
                  <button
                    onClick={handleBackToLogin}
                    className="w-full mt-4 text-sm text-foreground/50 hover:text-[var(--primary)] transition-colors"
                  >
                    ← {l("auth.backToLogin")}
                  </button>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
