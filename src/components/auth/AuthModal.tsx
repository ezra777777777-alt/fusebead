"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Loader2, RefreshCw, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { api, ApiError } from "@/lib/api";

type Mode = "form" | "verify" | "forgot" | "reset";

export function AuthModal() {
  const { isOpen, closeAuth, pendingEmail, login, register, verifyEmail, sendCode, clearPendingEmail } = useAuth();
  const { lang } = useLang();

  // Mode
  const [mode, setMode] = useState<Mode>("form");

  // Form state
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // silent
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
      // silent
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
    if (password.length < 6) {
      return lang === "zh" ? "密码至少6位" : "Password must be at least 6 characters";
    }
    if (tab === "register" && password !== confirm) {
      return lang === "zh" ? "两次密码不一致" : "Passwords do not match";
    }
    if (tab === "register" && !username.trim()) {
      return lang === "zh" ? "请输入用户名" : "Please enter a username";
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
      // verifyEmail calls setAuth which closes modal
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
    setMode("form");
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
    if (resetPassword.length < 6) {
      setError(lang === "zh" ? "密码至少6位" : "Password must be at least 6 characters");
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
      "auth.verifyDesc": { en: "A 6-digit code has been sent to", zh: "验证码已发送至" },
      "auth.verifyCodePlaceholder": { en: "Enter 6-digit code", zh: "输入6位验证码" },
      "auth.verifyBtn": { en: "Verify", zh: "验证" },
      "auth.verifyResend": { en: "Resend Code", zh: "重新发送" },
      "auth.backToLogin": { en: "Back to sign in", zh: "返回登录" },
      "auth.verifySent": { en: "Code sent!", zh: "已发送！" },
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button onClick={handleClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--surface-hover)]">
              <X className="h-5 w-5 text-foreground/40" />
            </button>

            {mode === "form" && (
              <>
                <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                  {lang === "zh" ? "欢迎来到 FuseBead" : "Welcome to FuseBead"}
                </h2>
                <p className="text-sm text-foreground/50 mb-5">
                  {lang === "zh" ? "登录以保存和同步你的创作" : "Sign in to save and sync your creations"}
                </p>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-hover)] mb-5">
                  {(["login", "register"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => switchTab(t)}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                        tab === t
                          ? "bg-white text-[var(--primary)] shadow-sm"
                          : "text-foreground/40 hover:text-foreground"
                      }`}
                      style={{ fontFamily: "var(--font-display)" }}
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
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
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
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
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  )}

                  {/* CAPTCHA */}
                  <div className="space-y-2">
                    <div className="flex gap-2 items-stretch">
                      <div className="flex-1 relative bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden" style={{ minHeight: 48 }}>
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
                        className="px-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center"
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-2.5 text-sm tracking-widest font-mono focus:outline-none focus:border-[var(--primary)] uppercase"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
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
                  <div className="w-12 h-12 rounded-full bg-[var(--bead-coral)]/10 flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-[var(--bead-coral)]" />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {l("auth.verifyTitle")}
                  </h2>
                  <p className="text-sm text-foreground/50">
                    {l("auth.verifyDesc")}{" "}
                    <span className="font-medium text-foreground">{pendingEmail}</span>
                  </p>
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
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
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
                        <div className="flex-1 relative bg-[var(--background)] rounded-lg border border-[var(--border)] overflow-hidden" style={{ minHeight: 40 }}>
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
                          className="px-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
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
                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tracking-widest font-mono focus:outline-none focus:border-[var(--primary)] uppercase"
                        />
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={loading || !resendCaptchaText.trim()}
                          className="px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                          style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
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
                  <div className="w-12 h-12 rounded-full bg-[var(--bead-coral)]/10 flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-6 w-6 text-[var(--bead-coral)]" />
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {lang === "zh" ? "发送验证码" : "Send Code"}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-green-500">
                      {lang === "zh" ? "验证码已发送！" : "Code sent!"}
                    </p>
                    <button
                      onClick={() => { setMode("reset"); setCode(""); setResetPassword(""); setResetConfirm(""); setResetDone(false); setError(""); }}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
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
                  <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {lang === "zh" ? "重置密码" : "Reset Password"}
                  </h2>
                  <p className="text-sm text-foreground/50">
                    {lang === "zh" ? `验证码已发送至 ${forgotEmail}` : `Code sent to ${forgotEmail}`}
                  </p>
                </div>

                {resetDone ? (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-green-500">
                      {lang === "zh" ? "密码重置成功！" : "Password reset successfully!"}
                    </p>
                    <button
                      onClick={handleBackToLogin}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:border-[var(--primary)]"
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
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
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {lang === "zh" ? "重置密码" : "Reset Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(""); }}
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
