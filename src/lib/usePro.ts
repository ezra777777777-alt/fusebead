"use client";

import { useAuth } from "@/lib/AuthContext";
import { useState, useCallback } from "react";

export function usePro() {
  const { user } = useAuth();
  const isPro = user?.is_admin || user?.plan === "pro" || user?.plan === "team";

  const [showPrompt, setShowPrompt] = useState(false);
  const openPrompt = useCallback(() => setShowPrompt(true), []);
  const closePrompt = useCallback(() => setShowPrompt(false), []);

  return { isPro, showPrompt, openPrompt, closePrompt };
}
