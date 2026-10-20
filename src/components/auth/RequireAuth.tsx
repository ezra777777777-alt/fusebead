"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, openAuth } = useAuth();
  const { lang } = useLang();

  useEffect(() => {
    if (!loading && !user) openAuth();
  }, [user, loading, openAuth]);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center px-4">
          <div className="cyber-paper mx-auto max-w-md border-4 border-black p-8 text-black shadow-[8px_8px_0_var(--orange)]">
            <p className="text-xs font-black tracking-[0.18em] text-[var(--orange)]">ACCESS GATE · 登录口</p>
            <h1 className="mt-2 text-2xl font-black">
              {lang === "zh" ? "请先登录" : "Sign in to continue"}
            </h1>
            <p className="mb-6 mt-3 text-sm font-semibold text-black/65">
              {lang === "zh" ? "登录后即可访问此功能。" : "Please sign in to access this feature."}
            </p>
            <button
              onClick={() => openAuth()}
              className="cyber-button bg-[var(--acid)] text-black"
            >
              {lang === "zh" ? "登录 / 注册" : "Sign In / Register"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
