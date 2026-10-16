"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

export type User = {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  plan: "free" | "pro" | "team";
  is_admin: boolean;
  subscription_expires_at?: string | null;
  subscription_status?: string;
  contribution_points?: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  pendingEmail: string | null;
  verificationMessage: string;
  login: (email: string, password: string, captchaId: string, captchaText: string) => Promise<void>;
  register: (username: string, email: string, password: string, captchaId: string, captchaText: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  sendCode: (email: string, captchaId: string, captchaText: string) => Promise<void>;
  clearPendingEmail: () => void;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => void;
  isOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  pendingEmail: null,
  verificationMessage: "",
  login: async () => {},
  register: async () => {},
  verifyEmail: async () => {},
  sendCode: async () => {},
  clearPendingEmail: () => {},
  refreshUser: async () => {},
  refreshToken: async () => {},
  logout: () => {},
  isOpen: false,
  openAuth: () => {},
  closeAuth: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
    const invalid = () => { setUser(null); setIsOpen(true); };
    window.addEventListener("auth-invalid", invalid);
    return () => window.removeEventListener("auth-invalid", invalid);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api<{
      id: number; username: string; email: string; avatar_url?: string;
      plan: "free" | "pro" | "team"; is_admin: boolean;
      subscription_expires_at?: string | null; subscription_status?: string;
      contribution_points?: number;
    }>("/user/me")
      .then((u) => setUser({ ...u, is_admin: u.is_admin ?? false }))
      .catch((e) => {
        if (!(e instanceof ApiError) || ![401, 403].includes(e.status)) setRestoreError("暂时无法读取账号，登录凭证已保留。服务恢复后可重新加载。");
      })
      .finally(() => setLoading(false));
  }, []);

  const setAuth = (token: string, u: any) => {
    localStorage.setItem("token", token);
    setUser({ ...u, is_admin: u.is_admin ?? false });
    setPendingEmail(null);
    setRestoreError("");
    setIsOpen(false);
  };

  const login = useCallback(async (email: string, password: string, captchaId: string, captchaText: string) => {
    try {
      const data = await api<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, captchaId, captchaText }),
      });
      setAuth(data.token, data.user);
    } catch (err: any) {
      if (err?.code === "EMAIL_UNVERIFIED") {
        setVerificationMessage("账号尚未验证邮箱，可在此重新发送验证码。");
        setPendingEmail(email.trim().toLowerCase());
        return;
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, captchaId: string, captchaText: string) => {
    const result = await api<{ success: boolean; email: string; emailSent: boolean }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, captchaId, captchaText, acceptedTerms: true }),
    });
    setVerificationMessage(result.emailSent ? "验证码已发送，10 分钟内有效。" : "账号已创建，但邮件暂未发送，请点击重新发送。");
    setPendingEmail(result.email);
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const data = await api<{ token: string; user: any }>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    setAuth(data.token, data.user);
  }, []);

  const sendCode = useCallback(async (email: string, captchaId: string, captchaText: string) => {
    await api<{ success: boolean }>("/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ email, captchaId, captchaText }),
    });
    setVerificationMessage("验证码已发送，请使用最新邮件中的验证码。");
  }, []);

  const clearPendingEmail = useCallback(() => {
    setPendingEmail(null);
    setVerificationMessage("");
  }, []);

  const refreshUser = useCallback(async () => {
      const u = await api<{
        id: number; username: string; email: string; avatar_url?: string;
        plan: "free" | "pro" | "team"; is_admin: boolean;
        subscription_expires_at?: string | null; subscription_status?: string;
      contribution_points?: number;
      }>("/user/me");
      setUser({ ...u, is_admin: u.is_admin ?? false });
  }, []);

  const refreshToken = useCallback(async () => {
    const data = await api<{ token: string }>("/user/me/refresh-token", { method: "POST" });
    localStorage.setItem("token", data.token);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setRestoreError("");
  }, []);

  const isAdmin = user?.is_admin ?? false;

  return (
    <AuthContext.Provider value={{
      user, loading: loading || !!restoreError, isAdmin, pendingEmail, verificationMessage,
      login, register, verifyEmail, sendCode, clearPendingEmail,
      refreshUser, refreshToken, logout,
      isOpen, openAuth: () => setIsOpen(true), closeAuth: () => setIsOpen(false),
    }}>
      {children}
      {restoreError && <div role="alert" className="fixed inset-x-4 top-20 z-[140] mx-auto max-w-xl border-2 border-black bg-yellow-50 p-4 text-sm text-black shadow-lg">{restoreError}<button onClick={() => window.location.reload()} className="ml-3 font-bold underline">重新读取账号</button></div>}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
