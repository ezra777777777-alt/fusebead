"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";

export type User = {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
  plan: "free" | "pro" | "team";
  is_admin: boolean;
  subscription_expires_at?: string | null;
  subscription_status?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  pendingEmail: string | null;
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
    }>("/user/me")
      .then((u) => setUser({ ...u, is_admin: u.is_admin ?? false }))
      .catch(() => { localStorage.removeItem("token"); })
      .finally(() => setLoading(false));
  }, []);

  const setAuth = (token: string, u: any) => {
    localStorage.setItem("token", token);
    setUser({ ...u, is_admin: u.is_admin ?? false });
    setPendingEmail(null);
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
      if (err?.status === 403) {
        setPendingEmail(email);
        return;
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, captchaId: string, captchaText: string) => {
    await api<{ success: boolean; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, captchaId, captchaText }),
    });
    setPendingEmail(email);
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
  }, []);

  const clearPendingEmail = useCallback(() => {
    setPendingEmail(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await api<{
        id: number; username: string; email: string; avatar_url?: string;
        plan: "free" | "pro" | "team"; is_admin: boolean;
        subscription_expires_at?: string | null; subscription_status?: string;
      }>("/user/me");
      setUser({ ...u, is_admin: u.is_admin ?? false });
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    const data = await api<{ token: string }>("/user/me/refresh-token", { method: "POST" });
    localStorage.setItem("token", data.token);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const isAdmin = user?.is_admin ?? false;

  return (
    <AuthContext.Provider value={{
      user, loading, isAdmin, pendingEmail,
      login, register, verifyEmail, sendCode, clearPendingEmail,
      refreshUser, refreshToken, logout,
      isOpen, openAuth: () => setIsOpen(true), closeAuth: () => setIsOpen(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
