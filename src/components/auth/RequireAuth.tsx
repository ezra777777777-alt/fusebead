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
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {lang === "zh" ? "请先登录" : "Sign in to continue"}
          </h1>
          <p className="text-foreground/50 mb-6">
            {lang === "zh" ? "登录后即可访问此功能，完全免费！" : "Please sign in to access this feature. It's free!"}
          </p>
          <button
            onClick={openAuth}
            className="rounded-full px-8 py-3 text-white font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))",
              fontFamily: "var(--font-display)",
            }}
          >
            {lang === "zh" ? "登录 / 注册" : "Sign In / Register"}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
