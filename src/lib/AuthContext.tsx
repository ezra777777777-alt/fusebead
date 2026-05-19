"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type User = {
  id: string;
  name: string;
  avatar?: string;
  provider: "phone" | "wechat" | "qq" | "google";
  plan: "free" | "pro" | "team";
};

type AuthContextType = {
  user: User | null;
  login: (provider: User["provider"], credential: string) => Promise<void>;
  logout: () => void;
  isOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isOpen: false,
  openAuth: () => {},
  closeAuth: () => {},
});

// Simulated auth — in production, replace with Supabase/Firebase
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const login = useCallback(async (provider: User["provider"], credential: string) => {
    // TODO: Replace with real OAuth / SMS verification
    await new Promise(r => setTimeout(r, 800));
    setUser({
      id: Math.random().toString(36).slice(2),
      name: provider === "phone" ? credential : `User_${credential.slice(0, 6)}`,
      provider,
      plan: "free",
    });
    setIsOpen(false);
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isOpen, openAuth: () => setIsOpen(true), closeAuth: () => setIsOpen(false) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
