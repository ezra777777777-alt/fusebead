"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Undo2, Redo2, PaintBucket, Eraser, Download } from "lucide-react";
import { PALETTES } from "@/lib/bead-colors";

const GRID = 29;
const CELL = 16;

type Tool = "paint" | "fill" | "erase";

interface HistoryEntry {
  grid: string[][];
  color: string;
}

export default function EditorPage() {
  const [brand, setBrand] = useState("perler");
  const palette = PALETTES[brand] || PALETTES.perler;
  
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: GRID }, () => Array(GRID).fill(""))
  );
  const [selectedColor, setSelectedColor] = useState(palette.colors[4][0]); // Hot Coral
  const [tool, setTool] = useState<Tool>("paint");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync selected color when brand changes
  useEffect(() => {
    setSelectedColor(palette.colors[4][0]);
  }, [brand, palette.colors]);

  // Render grid to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = GRID * CELL;
    canvas.height = GRID * CELL;
    canvas.style.width = GRID * CELL * 1.5 + "px";
    canvas.style.height = GRID * CELL * 1.5 + "px";

    // Background
    ctx.fillStyle = "#f5f0eb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = "#e0d8cf";
    ctx.lineWidth = 0.5;
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

    // Beads
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const code = grid[r][c];
        if (!code) continue;
        const bead = palette.colors.find(b => b[0] === code);
        if (!bead) continue;
        ctx.fillStyle = `rgb(${bead[2]},${bead[3]},${bead[4]})`;
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }, [grid, palette.colors]);

  const pushHistory = useCallback((newGrid: string[][], color: string) => {
    const entry = { grid: newGrid.map(r => [...r]), color };
    setHistory(h => [...h.slice(0, historyIdx + 1), entry]);
    setHistoryIdx(i => i + 1);
    setSelectedColor(color);
  }, [historyIdx]);

  const paintCell = useCallback((r: number, c: number) => {
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return;
    const newGrid = grid.map(row => [...row]);
    if (tool === "erase") {
      newGrid[r][c] = "";
    } else {
      newGrid[r][c] = selectedColor;
    }
    setGrid(newGrid);
  }, [grid, selectedColor, tool]);

  const floodFill = useCallback((startR: number, startC: number) => {
    const targetColor = grid[startR][startC];
    if (targetColor === selectedColor) return;
    
    const newGrid = grid.map(row => [...row]);
    const stack = [[startR, startC]];
    const visited = new Set<string>();
    
    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
      if (newGrid[r][c] !== targetColor) continue;
      visited.add(key);
      newGrid[r][c] = selectedColor;
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
    
    setGrid(newGrid);
    pushHistory(newGrid, selectedColor);
  }, [grid, selectedColor, pushHistory]);

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
      const newGrid = grid.map(row => [...row]);
      newGrid[r][c] = tool === "erase" ? "" : selectedColor;
      setGrid(newGrid);
      pushHistory(newGrid, selectedColor);
    }
  }, [grid, tool, selectedColor, floodFill, pushHistory]);

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
  }, [isDrawing, tool, paintCell]);

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

  const clearAll = () => {
    const empty = Array.from({ length: GRID }, () => Array(GRID).fill(""));
    setGrid(empty);
    pushHistory(empty, selectedColor);
  };

  // Count beads per color
  const colorCounts: Record<string, number> = {};
  grid.forEach(row => row.forEach(code => { if (code) colorCounts[code] = (colorCounts[code] || 0) + 1; }));

  return (
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors mb-4">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Pixel Editor
          </h1>
          <p className="text-sm text-foreground/50 mt-1">Draw your own bead pattern on a 29×29 grid.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tools & Palette */}
          <div className="lg:col-span-1 space-y-4">
            {/* Brand selector */}
            <div>
              <label className="text-xs text-foreground/50 mb-1 block">Brand</label>
              <select
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {Object.entries(PALETTES).map(([k, p]) => (
                  <option key={k} value={k}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Tools */}
            <div className="flex gap-2">
              {([
                ["paint", PaintBucket, "Paint"],
                ["fill", PaintBucket, "Fill"],
                ["erase", Eraser, "Erase"],
              ] as const).map(([t, Icon, label]) => (
                <button
                  key={t}
                  onClick={() => setTool(t)}
                  className={`flex-1 flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all ${
                    tool === t
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
              <button onClick={undo} disabled={historyIdx < 0} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-30">
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
              <button onClick={redo} disabled={historyIdx >= history.length - 1} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-30">
                <Redo2 className="h-3.5 w-3.5" /> Redo
              </button>
            </div>

            {/* Color palette */}
            <div>
              <p className="text-xs text-foreground/50 mb-2">Colors ({palette.colors.length})</p>
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
                <Download className="h-4 w-4" /> Export PNG
              </button>
              <button onClick={clearAll} className="w-full rounded-full border border-[var(--border)] px-4 py-2 text-sm text-foreground/50 hover:text-foreground transition-colors">
                Clear All
              </button>
            </div>

            {/* Materials count */}
            {Object.keys(colorCounts).length > 0 && (
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Bead Count ({Object.keys(colorCounts).length} colors)
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
          <div className="lg:col-span-3 flex justify-center">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                className="cursor-crosshair pixel-render"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
