"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { T, type Lang } from "@/lib/i18n";

export type { Lang };

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}>({ lang: "zh", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");
  const t = useCallback((key: string) => T[key]?.[lang] || key, [lang]);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }
