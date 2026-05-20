"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Undo2, Redo2, PaintBucket, Eraser, Download, Share2, Pencil, Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { PALETTES } from "@/lib/bead-colors";
import { hexGridToBeadCodes } from "@/lib/color-convert";
import { useLang } from "@/lib/LangContext";
import { usePro } from "@/lib/usePro";
import { ProBadge } from "@/components/shared/ProBadge";
import { ProFeaturePrompt } from "@/components/shared/ProFeaturePrompt";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { PublishFormModal } from "@/components/publish/PublishFormModal";

const CELL = 16;

type Tool = "paint" | "fill" | "erase";

interface HistoryEntry {
  grid: string[][];
  color: string;
}

function downsampleGrid(grid: string[][], targetSize: number): string[][] {
  const srcSize = grid.length;
  if (srcSize <= targetSize) return grid;
  const step = srcSize / targetSize;
  const result: string[][] = [];
  for (let y = 0; y < targetSize; y++) {
    const row: string[] = [];
    for (let x = 0; x < targetSize; x++) {
      const srcY = Math.floor(y * step);
      const srcX = Math.floor(x * step);
      row.push(grid[srcY]?.[srcX] || "");
    }
    result.push(row);
  }
  return result;
}

export default function EditorPage() {
  const { t, lang } = useLang();
  const { isPro, showPrompt, openPrompt, closePrompt } = usePro();
  const { user, openAuth } = useAuth();
  const searchParams = useSearchParams();
  const isRemix = searchParams.get("remix") === "1";

  const GRID = isPro ? 58 : 29;
  const [brand, setBrand] = useState("perler");
  const [publishOpen, setPublishOpen] = useState(false);
  const palette = PALETTES[brand] || PALETTES.perler;

  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: GRID }, () => Array(GRID).fill(""))
  );
  const [selectedColor, setSelectedColor] = useState(palette.colors[4][0]);
  const [tool, setTool] = useState<Tool>("paint");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [remixTitle, setRemixTitle] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load remix data from sessionStorage
  useEffect(() => {
    if (!isRemix) return;
    try {
      const raw = sessionStorage.getItem("editorRemix");
      if (!raw) return;
      const data = JSON.parse(raw);
      sessionStorage.removeItem("editorRemix");
      setRemixTitle(data.title || null);

      const hexGrid: string[][] = data.gridData;
      const pal = PALETTES[data.brand || "perler"]?.colors || PALETTES.perler.colors;
      if (data.brand) setBrand(data.brand);

      const downsampled = downsampleGrid(hexGrid, GRID);
      const beadGrid = hexGridToBeadCodes(downsampled, pal as any);
      setGrid(beadGrid);

      // Restore color counts
    } catch { /* ignore */ }
  }, [isRemix]);

  // Rebuild grid when GRID changes (Pro upgrade mid-session)
  useEffect(() => {
    setGrid(prev => {
      if (prev.length === GRID) return prev;
      const newGrid = Array.from({ length: GRID }, (_, y) =>
        Array.from({ length: GRID }, (_, x) => (prev[y]?.[x]) || "")
      );
      return newGrid;
    });
  }, [GRID]);

  // Sync selected color when brand changes
  useEffect(() => {
    setSelectedColor(palette.colors[4]?.[0] || palette.colors[0][0]);
  }, [brand, palette.colors]);

  // Render grid to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = GRID * CELL;
    canvas.height = GRID * CELL;

    ctx.fillStyle = "#f5f0eb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#e0d8cf";
    ctx.lineWidth = GRID > 40 ? 0.3 : 0.5;
    for (let r = 0; r <= GRID; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(GRID * CELL, r * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * CELL, 0);
      ctx.lineTo(r * CELL, GRID * CELL);
      ctx.stroke();
    }

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const code = grid[r]?.[c];
        if (!code) continue;
        const bead = palette.colors.find(b => b[0] === code);
        if (!bead) continue;
        ctx.fillStyle = `rgb(${bead[2]},${bead[3]},${bead[4]})`;
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }, [grid, palette.colors, GRID]);

  const pushHistory = useCallback((newGrid: string[][], color: string) => {
    if (!isPro) return;
    const entry = { grid: newGrid.map(r => [...r]), color };
    setHistory(h => [...h.slice(0, historyIdx + 1), entry]);
    setHistoryIdx(i => i + 1);
    setSelectedColor(color);
  }, [historyIdx, isPro]);

  const paintCell = useCallback((r: number, c: number) => {
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return;
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[r][c] = tool === "erase" ? "" : selectedColor;
      return newGrid;
    });
  }, [selectedColor, tool, GRID]);

  const floodFill = useCallback((startR: number, startC: number) => {
    const targetColor = grid[startR]?.[startC];
    if (targetColor === selectedColor) return;

    const newGrid = grid.map(row => [...row]);
    const stack = [[startR, startC]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
      if (newGrid[r]?.[c] !== targetColor) continue;
      visited.add(key);
      newGrid[r][c] = selectedColor;
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    setGrid(newGrid);
    pushHistory(newGrid, selectedColor);
  }, [grid, selectedColor, pushHistory, GRID]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = (GRID * CELL) / rect.width;
    const scaleY = (GRID * CELL) / rect.height;
    const r = Math.floor((e.clientY - rect.top) * scaleY / CELL);
    const c = Math.floor((e.clientX - rect.left) * scaleX / CELL);
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return;

    if (tool === "fill") {
      floodFill(r, c);
    } else {
      setGrid(prev => {
        const newGrid = prev.map(row => [...row]);
        newGrid[r][c] = tool === "erase" ? "" : selectedColor;
        return newGrid;
      });
      pushHistory(grid.map(row => [...row]), selectedColor);
    }
  }, [grid, tool, selectedColor, floodFill, pushHistory, GRID]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDrawing(true);
    handleCanvasClick(e);
  }, [handleCanvasClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || tool === "fill") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = (GRID * CELL) / rect.width;
    const scaleY = (GRID * CELL) / rect.height;
    const r = Math.floor((e.clientY - rect.top) * scaleY / CELL);
    const c = Math.floor((e.clientX - rect.left) * scaleX / CELL);
    paintCell(r, c);
  }, [isDrawing, tool, paintCell, GRID]);

  // Touch support
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawing || tool === "fill") return;
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = (GRID * CELL) / rect.width;
    const scaleY = (GRID * CELL) / rect.height;
    const touch = e.touches[0];
    const r = Math.floor((touch.clientY - rect.top) * scaleY / CELL);
    const c = Math.floor((touch.clientX - rect.left) * scaleX / CELL);
    paintCell(r, c);
  }, [isDrawing, tool, paintCell, GRID]);

  const undo = () => {
    if (historyIdx < 0) return;
    if (historyIdx === 0) {
      setGrid(Array.from({ length: GRID }, () => Array(GRID).fill("")));
      setHistoryIdx(-1);
      return;
    }
    const prev = history[historyIdx - 1];
    setGrid(prev.grid.map(r => [...r]));
    setSelectedColor(prev.color);
    setHistoryIdx(i => i - 1);
  };

  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    setGrid(next.grid.map(r => [...r]));
    setSelectedColor(next.color);
    setHistoryIdx(i => i + 1);
  };

  const exportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "bead-pattern.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // Publish state
  const [publishGrid, setPublishGrid] = useState<string[][] | null>(null);
  const [publishCounts, setPublishCounts] = useState<Record<string, number> | null>(null);

  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const handleSaveDraft = async () => {
    if (!user) { openAuth(); return; }
    setDraftSaving(true);
    try {
      const hexGrid = grid.map(row =>
        row.map(code => {
          if (!code) return "";
          const bead = palette.colors.find(c => c[0] === code);
          if (!bead) return "";
          const r = bead[2].toString(16).padStart(2, "0");
          const g = bead[3].toString(16).padStart(2, "0");
          const b = bead[4].toString(16).padStart(2, "0");
          return `#${r}${g}${b}`;
        })
      );
      const hexCounts: Record<string, number> = {};
      Object.entries(colorCounts).forEach(([code, count]) => {
        const bead = palette.colors.find(c => c[0] === code);
        if (bead) {
          const r = bead[2].toString(16).padStart(2, "0");
          const g = bead[3].toString(16).padStart(2, "0");
          const b = bead[4].toString(16).padStart(2, "0");
          hexCounts[`#${r}${g}${b}`] = count;
        }
      });
      await api("/patterns", {
        method: "POST",
        body: JSON.stringify({
          title: remixTitle || (lang === "zh" ? "未命名草稿" : "Untitled Draft"),
          brand,
          gridSize: GRID,
          gridData: hexGrid,
          colorCounts: hexCounts,
          isPublic: false,
        }),
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setDraftSaving(false); }
  };

  const handlePublishClick = () => {
    if (!user) { openAuth(); return; }
    const hexGrid = grid.map(row =>
      row.map(code => {
        if (!code) return "";
        const bead = palette.colors.find(c => c[0] === code);
        if (!bead) return "";
        const r = bead[2].toString(16).padStart(2, "0");
        const g = bead[3].toString(16).padStart(2, "0");
        const b = bead[4].toString(16).padStart(2, "0");
        return `#${r}${g}${b}`;
      })
    );

    const hexCounts: Record<string, number> = {};
    Object.entries(colorCounts).forEach(([code, count]) => {
      const bead = palette.colors.find(c => c[0] === code);
      if (bead) {
        const r = bead[2].toString(16).padStart(2, "0");
        const g = bead[3].toString(16).padStart(2, "0");
        const b = bead[4].toString(16).padStart(2, "0");
        hexCounts[`#${r}${g}${b}`] = count;
      }
    });

    setPublishGrid(hexGrid);
    setPublishCounts(hexCounts);
    setPublishOpen(true);
  };

  const clearAll = () => {
    const empty = Array.from({ length: GRID }, () => Array(GRID).fill(""));
    setGrid(empty);
    pushHistory(empty, selectedColor);
    setRemixTitle(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (key === "z") { e.preventDefault(); if (isPro) undo(); return; }
        if (key === "y") { e.preventDefault(); if (isPro) redo(); return; }
        return;
      }
      if (key === "b") setTool("paint");
      else if (key === "g") setTool("fill");
      else if (key === "e") setTool("erase");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPro, history, historyIdx, tool]);

  // Count beads per color
  const colorCounts: Record<string, number> = {};
  grid.forEach(row => row.forEach(code => { if (code) colorCounts[code] = (colorCounts[code] || 0) + 1; }));

  // Zoom & pan handlers
  const zoomIn = () => setZoom(z => Math.min(3, z + 0.25));
  const zoomOut = () => setZoom(z => Math.max(0.5, z - 0.25));
  const resetZoom = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(3, z + (e.deltaY > 0 ? -0.25 : 0.25))));
  }, []);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }, [panOffset]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  }, [isPanning]);

  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  const displaySize = Math.min(GRID * CELL * 1.5, 600);

  return (
    <RequireAuth>
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors mb-4">
            <ChevronLeft className="h-4 w-4" /> {t("common.back")}
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {t("editor.title")}
            </h1>
            {remixTitle && (
              <span className="text-sm text-foreground/40 bg-[var(--surface-hover)] rounded-full px-3 py-1">
                <Pencil className="h-3 w-3 inline mr-1" />
                {remixTitle}
              </span>
            )}
            <span className="text-xs text-foreground/40 bg-[var(--surface-hover)] rounded-full px-2 py-0.5">
              {GRID}×{GRID} {!isPro && <ProBadge />}
            </span>
          </div>
          <p className="text-sm text-foreground/50 mt-1">{t("editor.sub")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tools & Palette */}
          <div className="lg:col-span-1 space-y-4">
            {/* Brand selector */}
            <div>
              <label className="text-xs text-foreground/50 mb-1 flex items-center gap-1">{t("gen.brand")} {!isPro && <ProBadge />}</label>
              <select
                value={brand}
                onChange={e => { if (!isPro && e.target.value !== "perler") { openPrompt(); setBrand("perler"); } else { setBrand(e.target.value); } }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {Object.entries(PALETTES).map(([k, p]) => (
                  <option key={k} value={k}>{p.name}{!isPro && k !== "perler" ? " 🔒" : ""}</option>
                ))}
              </select>
            </div>

            {/* Tools */}
            <div className="flex gap-2">
              {([
                ["paint", PaintBucket, t("editor.paint")],
                ["fill", PaintBucket, t("editor.fill")],
                ["erase", Eraser, t("editor.erase")],
              ] as const).map(([tName, Icon, label]) => (
                <button
                  key={tName}
                  onClick={() => setTool(tName)}
                  className={`flex-1 flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all ${
                    tool === tName
                      ? "border-[var(--bead-coral)] bg-[var(--bead-coral)]/10 text-[var(--bead-coral)]"
                      : "border-[var(--border)] text-foreground/50 hover:border-foreground/20"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Undo/Redo */}
            <div className="flex gap-2">
              <button onClick={() => { if (!isPro) { openPrompt(); return; } undo(); }} disabled={!isPro || historyIdx < 0} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-30">
                <Undo2 className="h-3.5 w-3.5" /> {t("editor.undo")}
              </button>
              <button onClick={() => { if (!isPro) { openPrompt(); return; } redo(); }} disabled={!isPro || historyIdx >= history.length - 1} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-30">
                <Redo2 className="h-3.5 w-3.5" /> {t("editor.redo")} {!isPro && <ProBadge />}
              </button>
            </div>

            {/* Color palette */}
            <div>
              <p className="text-xs text-foreground/50 mb-2">{t("editor.colors")} ({palette.colors.length})</p>
              <div className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto pr-1">
                {palette.colors.map(([code, name, r, g, b]) => (
                  <button
                    key={code}
                    onClick={() => setSelectedColor(code)}
                    title={`${name} (${code})`}
                    className={`w-8 h-8 rounded-md border-2 transition-all ${
                      selectedColor === code ? "border-[var(--bead-coral)] scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={exportPNG} className="w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
                <Download className="h-4 w-4" /> {t("editor.export")}
              </button>
              <button onClick={handlePublishClick} className="w-full flex items-center justify-center gap-2 rounded-full border border-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors">
                <Share2 className="h-4 w-4" /> {t("editor.publish")}
              </button>
              <button onClick={handleSaveDraft} disabled={draftSaving} className="w-full flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-4 py-2.5 text-sm text-foreground/40 hover:text-foreground transition-colors disabled:opacity-50">
                {draftSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {draftSaved ? (lang === "zh" ? "已保存" : "Saved!") : draftSaving ? t("draft.saving") : t("draft.save")}
              </button>
              <button onClick={clearAll} className="w-full rounded-full border border-[var(--border)] px-4 py-2 text-sm text-foreground/50 hover:text-foreground transition-colors">
                {t("editor.clear")}
              </button>
            </div>

            {/* Materials count */}
            {Object.keys(colorCounts).length > 0 && (
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {t("editor.count")} ({Object.keys(colorCounts).length} {t("common.colors")})
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).map(([code, count]) => {
                    const bead = palette.colors.find(b => b[0] === code);
                    if (!bead) return null;
                    return (
                      <div key={code} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: `rgb(${bead[2]},${bead[3]},${bead[4]})` }} />
                        <span className="truncate flex-1">{bead[1]}</span>
                        <span className="text-foreground/40">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3 flex flex-col items-center">
            <div
              ref={containerRef}
              className="rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden select-none"
              style={{ width: displaySize, height: displaySize }}
              onWheel={handleWheel}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              onContextMenu={e => e.preventDefault()}
            >
              <div
                style={{
                  transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                  transformOrigin: "0 0",
                  width: GRID * CELL,
                  height: GRID * CELL,
                }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={e => { if (e.button === 0) handleMouseDown(e); }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={(e) => { setIsDrawing(true); }}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => setIsDrawing(false)}
                  className="cursor-crosshair pixel-render touch-none"
                />
              </div>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-1 mt-3 bg-[var(--surface)] rounded-full border border-[var(--border)] px-2 py-1">
              <button
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-full hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors"
                title={lang === "zh" ? "缩小" : "Zoom out"}
              >
                <ZoomOut className="h-4 w-4 text-foreground/50" />
              </button>
              <span
                className="text-xs text-foreground/50 min-w-[44px] text-center cursor-pointer hover:text-foreground transition-colors"
                onClick={resetZoom}
                title={lang === "zh" ? "重置缩放" : "Reset zoom"}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="p-1.5 rounded-full hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors"
                title={lang === "zh" ? "放大" : "Zoom in"}
              >
                <ZoomIn className="h-4 w-4 text-foreground/50" />
              </button>
              {zoom !== 1 && (
                <button
                  onClick={resetZoom}
                  className="p-1.5 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
                  title={lang === "zh" ? "重置" : "Reset"}
                >
                  <RotateCcw className="h-3.5 w-3.5 text-foreground/30" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-foreground/20 mt-1">
              {lang === "zh" ? "Ctrl+滚轮缩放 · 右键拖拽平移" : "Ctrl+scroll to zoom · Right-drag to pan"}
            </p>
          </div>
        </div>
      </div>
    </div>
    <ProFeaturePrompt open={showPrompt} onClose={closePrompt} />
    {publishGrid && publishCounts && (
      <PublishFormModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        gridData={publishGrid}
        colorCounts={publishCounts}
        brand={brand}
        gridSize={GRID}
      />
    )}
    </RequireAuth>
  );
}
