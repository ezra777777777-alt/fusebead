"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, openAuth } = useAuth();

  useEffect(() => {
    if (!user) openAuth();
  }, [user, openAuth]);

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Sign in to continue
          </h1>
          <p className="text-foreground/50 mb-6">
            Please sign in to access this tool. It&apos;s free!
          </p>
          <button
            onClick={openAuth}
            className="rounded-full px-8 py-3 text-white font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))",
              fontFamily: "var(--font-display)",
            }}
          >
            Sign In / 登录
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
