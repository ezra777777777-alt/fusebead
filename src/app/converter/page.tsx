"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ArrowRightLeft, Search } from "lucide-react";
import { PALETTES, findClosestColor, BRAND_NAMES, getColorName } from "@/lib/bead-colors";
import { useLang } from "@/lib/LangContext";
import { usePro } from "@/lib/usePro";
import { ProBadge } from "@/components/shared/ProBadge";
import { ProFeaturePrompt } from "@/components/shared/ProFeaturePrompt";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function ConverterPage() {
  const { t, lang } = useLang();
  const { isPro, showPrompt, openPrompt, closePrompt } = usePro();
  const [fromBrand, setFromBrand] = useState("perler");
  const [toBrand, setToBrand] = useState("hama");
  const [search, setSearch] = useState("");

  const fromColors = PALETTES[fromBrand]?.colors || [];
  const toColors = PALETTES[toBrand]?.colors || [];

  // Build cross-reference map
  const mapping = useMemo(() => {
    return fromColors.map(from => {
      const match = findClosestColor([from[2], from[3], from[4]], toColors);
      const dist = Math.sqrt(
        (from[2] - match[2]) ** 2 + (from[3] - match[3]) ** 2 + (from[4] - match[4]) ** 2
      );
      return { from, to: match, distance: Math.round(dist * 10) / 10 };
    });
  }, [fromBrand, toBrand, fromColors, toColors]);

  const filtered = search
    ? mapping.filter(m =>
        m.from[1].toLowerCase().includes(search.toLowerCase()) ||
        getColorName(m.from[1], lang).toLowerCase().includes(search.toLowerCase()) ||
        m.from[0].toLowerCase().includes(search.toLowerCase())
      )
    : mapping;

  return (
    <RequireAuth>
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors mb-4">
            <ChevronLeft className="h-4 w-4" /> {t("common.back")}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
            {t("conv.title")}
          </h1>
          <p className="text-sm text-foreground/50">{t("conv.sub")}</p>
        </div>

        {/* Brand selectors */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
          {(["from", "to"] as const).map((dir) => (
            <select
              key={dir}
              value={dir === "from" ? fromBrand : toBrand}
              onChange={e => {
                if (!isPro && e.target.value !== "perler") { openPrompt(); return; }
                dir === "from" ? setFromBrand(e.target.value) : setToBrand(e.target.value);
              }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {Object.keys(PALETTES).map(k => (
                <option key={k} value={k}>{PALETTES[k].name} ({PALETTES[k].colors.length} {t("common.colors")}){!isPro && k !== "perler" ? " 🔒" : ""}</option>
              ))}
            </select>
          ))}
          {!isPro && <ProBadge />}
          <ArrowRightLeft className="h-5 w-5 text-foreground/30 shrink-0" />
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
            <input
              type="text"
              placeholder={t("conv.search")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-4 text-xs text-foreground/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> {t("conv.good")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> {t("conv.ok")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> {t("conv.poor")}
          </span>
        </div>

        {/* Mapping table */}
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_40px_1fr] bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
            <span>{BRAND_NAMES[fromBrand as keyof typeof BRAND_NAMES] || fromBrand}</span>
            <span className="text-center">→</span>
            <span>{BRAND_NAMES[toBrand as keyof typeof BRAND_NAMES] || toBrand}</span>
          </div>

          {/* Rows */}
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.map(({ from, to, distance }) => {
              const matchQuality = distance < 30 ? "good" : distance < 70 ? "ok" : "poor";
              const qualityColor = matchQuality === "good" ? "bg-green-400/20 text-green-600" : matchQuality === "ok" ? "bg-yellow-400/20 text-yellow-600" : "bg-red-400/20 text-red-600";
              
              return (
                <div
                  key={from[0]}
                  className="grid grid-cols-[1fr_40px_1fr] border-b border-[var(--border)] last:border-0 px-4 py-2.5 items-center hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {/* Source */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-6 h-6 rounded-md shrink-0 border border-black/5"
                      style={{ backgroundColor: `rgb(${from[2]},${from[3]},${from[4]})` }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getColorName(from[1], lang)}</p>
                      <p className="text-xs text-foreground/30">{from[0]}</p>
                    </div>
                  </div>

                  {/* Arrow + quality */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-foreground/20 text-xs">→</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${qualityColor}`}>
                      {distance}
                    </span>
                  </div>

                  {/* Match */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-6 h-6 rounded-md shrink-0 border border-black/5"
                      style={{ backgroundColor: `rgb(${to[2]},${to[3]},${to[4]})` }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getColorName(to[1], lang)}</p>
                      <p className="text-xs text-foreground/30">{to[0]}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-center text-xs text-foreground/30">
          {lang === "zh"
            ? `显示 ${filtered.length} / ${mapping.length} 条颜色映射。`
            : `Showing ${filtered.length} of ${mapping.length} color mappings.`}{" "}
          {t("conv.summary")}
        </div>
      </div>
    </div>
    <ProFeaturePrompt open={showPrompt} onClose={closePrompt} />
    </RequireAuth>
  );
}
