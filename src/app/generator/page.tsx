"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Upload, ImagePlus, Download, Settings2, Grid3X3, Palette,
  X, ChevronLeft, Loader2, Sun, Contrast, Droplet, Pipette, FileText,
} from "lucide-react";
import { PALETTES } from "@/lib/bead-colors";
import { processImage, samplePixel, DEFAULT_ADJUSTMENTS, type ProcessedPattern, type ImageAdjustments } from "@/lib/image-processor";
import { useLang } from "@/lib/LangContext";

type Config = { gridSize: number; dithering: boolean; maxColors: number; brand: string; };

const TEMPLATES = [
  { name: "Heart", emoji: "❤️", gridSize: 29, maxColors: 8, dithering: false },
  { name: "Cat Face", emoji: "🐱", gridSize: 29, maxColors: 12, dithering: true },
  { name: "Star", emoji: "⭐", gridSize: 29, maxColors: 5, dithering: false },
  { name: "Flower", emoji: "🌸", gridSize: 29, maxColors: 10, dithering: true },
];

// Simple PDF generation (grid + color list)
function generatePDF(pattern: ProcessedPattern, brand: string) {
  const brandName = PALETTES[brand]?.name || brand;
  const { grid, width, height, colorCounts } = pattern;
  const palette = PALETTES[brand]?.colors || [];

  // Build printable content as data URI via canvas
  const cellSize = 10;
  const headerH = 60;
  const footerH = 120;
  const canvasW = width * cellSize;
  const canvasH = height * cellSize + headerH + footerH;

  const c = document.createElement("canvas");
  c.width = canvasW;
  c.height = canvasH;
  const ctx = c.getContext("2d")!;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Header
  ctx.fillStyle = "#2d1b14";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`FuseBead.art — ${brandName} Pattern`, 10, 30);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText(`${width}×${height} beads | ${Object.keys(colorCounts).length} colors`, 10, 50);

  // Grid
  const gridY = headerH;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const code = grid[y][x];
      if (!code) { ctx.fillStyle = "#f0f0f0"; }
      else {
        const bead = palette.find(b => b[0] === code);
        ctx.fillStyle = bead ? `rgb(${bead[2]},${bead[3]},${bead[4]})` : "#ccc";
      }
      ctx.fillRect(x * cellSize, gridY + y * cellSize, cellSize - 0.5, cellSize - 0.5);
    }
    // Row number
    ctx.fillStyle = "#ccc";
    ctx.font = "8px monospace";
    ctx.fillText(String(y + 1), width * cellSize + 4, gridY + y * cellSize + 9);
  }
  // Column numbers
  for (let x = 0; x < width; x++) {
    ctx.fillStyle = "#ccc";
    ctx.font = "8px monospace";
    ctx.fillText(String(x + 1), x * cellSize + 2, gridY - 4);
  }

  // Footer: color list
  const footerY = gridY + height * cellSize + 16;
  ctx.fillStyle = "#2d1b14";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("Materials List", 10, footerY);
  let fy = footerY + 18;
  const entries = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [code, count] of entries) {
    const bead = palette.find(b => b[0] === code);
    if (!bead) continue;
    ctx.fillStyle = `rgb(${bead[2]},${bead[3]},${bead[4]})`;
    ctx.fillRect(10, fy - 8, 10, 10);
    ctx.fillStyle = "#333";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${bead[1]} (${code}) — ${count} beads`, 24, fy);
    fy += 16;
    if (fy > canvasH - 20) break;
  }

  const link = document.createElement("a");
  link.download = "bead-pattern.pdf";
  link.href = c.toDataURL("image/jpeg", 0.92);
  link.click();
}

export default function GeneratorPage() {
  const { t } = useLang();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pattern, setPattern] = useState<ProcessedPattern | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>({ gridSize: 50, dithering: true, maxColors: 0, brand: "perler" });
  const [showSettings, setShowSettings] = useState(false);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLImageElement>(null);

  const palette = PALETTES[config.brand] || PALETTES.perler;

  const handleImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please upload an image file (JPG, PNG, WebP)."); return; }
    setError(null); setPattern(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = url;
    };
    reader.readAsDataURL(file);
  }, []);

  const generatePattern = useCallback(async () => {
    if (!image) return;
    setProcessing(true); setError(null);
    try {
      const colors = palette.colors;
      const h = Math.round(config.gridSize * (image.height / image.width));
      const result = await processImage(image, config.gridSize, h, colors, config.maxColors > 0 ? config.maxColors : undefined, config.dithering, adjustments);
      setPattern(result);
    } catch { setError("Failed to process image."); }
    finally { setProcessing(false); }
  }, [image, config, palette, adjustments]);

  // Preview canvas
  useEffect(() => {
    if (!pattern || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const pixelSize = 8;
    canvas.width = pattern.width * pixelSize;
    canvas.height = pattern.height * pixelSize;
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const code = pattern.grid[y][x];
        if (!code) continue;
        const bead = palette.colors.find(c => c[0] === code);
        if (!bead) continue;
        ctx.fillStyle = `rgb(${bead[2]},${bead[3]},${bead[4]})`;
        ctx.fillRect(x * pixelSize + 1, y * pixelSize + 1, pixelSize - 2, pixelSize - 2);
      }
    }
  }, [pattern, palette.colors]);

  const clearImage = () => { setImage(null); setImageUrl(null); setPattern(null); };

  const handlePreviewClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!eyedropperActive || !image) return;
    const rect = previewRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const color = samplePixel(image, x, y);
    setAdjustments(a => ({ ...a, bgColor: color, removeBg: true }));
    setEyedropperActive(false);
  };

  return (
    <div className="min-h-screen pt-16 bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-3">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            {t("gen.title")}
          </h1>
          <p className="text-sm text-foreground/50 mt-1">{t("gen.sub")}</p>
        </div>

        {/* Templates */}
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-xs text-foreground/40 self-center mr-1">{t("gen.quick")}:</span>
          {TEMPLATES.map(tmpl => (
            <button key={tmpl.name} onClick={() => setConfig(c => ({ ...c, gridSize: tmpl.gridSize, maxColors: tmpl.maxColors, dithering: tmpl.dithering }))}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] transition-colors"
            >{tmpl.emoji} {t(tmpl.name)}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Upload */}
            <div onClick={() => document.getElementById("file-input")?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                imageUrl ? "border-green-500/20 bg-green-500/[0.02]" : "border-[var(--border)] hover:border-foreground/20 hover:bg-[var(--surface-hover)]"
              }`}>
              {imageUrl ? (
                <div className="relative">
                  <img ref={previewRef} src={imageUrl} alt="Preview" onClick={handlePreviewClick}
                    className={`mx-auto max-h-40 rounded-lg ${eyedropperActive ? "cursor-crosshair" : ""}`} />
                  <button onClick={(e) => { e.stopPropagation(); clearImage(); }}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-foreground text-background hover:opacity-80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <><ImagePlus className="mx-auto h-10 w-10 text-foreground/30 mb-3" />
                  <p className="text-sm font-medium">Drop image or click</p>
                  <p className="text-xs text-foreground/40 mt-1">JPG, PNG, WebP</p></>
              )}
              <input id="file-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
            </div>

            {/* Settings */}
            <div className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
              <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-between w-full text-sm font-medium">
                <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> Settings</span>
                <span className="text-foreground/40">{showSettings ? "▲" : "▼"}</span>
              </button>
              {showSettings && (
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/50 mb-1"><Palette className="h-3.5 w-3.5" /> Brand</label>
                    <select value={config.brand} onChange={e => setConfig({ ...config, brand: e.target.value })}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                      {Object.entries(PALETTES).map(([k, p]) => <option key={k} value={k}>{p.name} ({p.colors.length})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/50 mb-1"><Grid3X3 className="h-3.5 w-3.5" /> Grid: {config.gridSize}×{Math.round(config.gridSize * (image?.height || 1) / (image?.width || 1))}</label>
                    <input type="range" min={20} max={150} value={config.gridSize} onChange={e => setConfig({ ...config, gridSize: Number(e.target.value) })} className="w-full accent-[var(--bead-coral)]" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/50 mb-1"><Palette className="h-3.5 w-3.5" /> Max Colors: {config.maxColors > 0 ? config.maxColors : "All"}</label>
                    <input type="range" min={0} max={30} step={2} value={config.maxColors} onChange={e => setConfig({ ...config, maxColors: Number(e.target.value) })} className="w-full accent-[var(--bead-coral)]" />
                  </div>
                  <label className="flex items-center justify-between text-sm"><span>Dithering</span>
                    <input type="checkbox" checked={config.dithering} onChange={e => setConfig({ ...config, dithering: e.target.checked })} className="accent-[var(--bead-coral)]" /></label>
                </div>
              )}
            </div>

            {/* Image Adjustments */}
            <div className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
              <button onClick={() => setShowAdjustments(!showAdjustments)} className="flex items-center justify-between w-full text-sm font-medium">
                <span className="flex items-center gap-2"><Sun className="h-4 w-4" /> Image Adjustments</span>
                <span className="text-foreground/40">{showAdjustments ? "▲" : "▼"}</span>
              </button>
              {showAdjustments && (
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/50 mb-1"><Sun className="h-3.5 w-3.5" /> Brightness: {adjustments.brightness}</label>
                    <input type="range" min={0} max={200} value={adjustments.brightness} onChange={e => setAdjustments({ ...adjustments, brightness: Number(e.target.value) })} className="w-full accent-[var(--bead-coral)]" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/50 mb-1"><Contrast className="h-3.5 w-3.5" /> Contrast: {adjustments.contrast}</label>
                    <input type="range" min={0} max={200} value={adjustments.contrast} onChange={e => setAdjustments({ ...adjustments, contrast: Number(e.target.value) })} className="w-full accent-[var(--bead-coral)]" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/50 mb-1"><Droplet className="h-3.5 w-3.5" /> Saturation: {adjustments.saturation}</label>
                    <input type="range" min={0} max={200} value={adjustments.saturation} onChange={e => setAdjustments({ ...adjustments, saturation: Number(e.target.value) })} className="w-full accent-[var(--bead-coral)]" />
                  </div>
                  <div>
                    <button onClick={() => setEyedropperActive(!eyedropperActive)}
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${eyedropperActive ? "border-[var(--bead-coral)] bg-[var(--bead-coral)]/10 text-[var(--bead-coral)]" : "border-[var(--border)] text-foreground/50"}`}>
                      <Pipette className="h-3.5 w-3.5" /> {eyedropperActive ? "Click image to pick bg color" : "Remove Background"}
                    </button>
                    {adjustments.removeBg && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-5 h-5 rounded border" style={{ backgroundColor: `rgb(${adjustments.bgColor.join(",")})` }} />
                        <input type="range" min={1} max={80} value={adjustments.bgTolerance} onChange={e => setAdjustments({ ...adjustments, bgTolerance: Number(e.target.value) })} className="flex-1 accent-[var(--bead-coral)]" />
                        <span className="text-xs text-foreground/40">{adjustments.bgTolerance}</span>
                        <button onClick={() => setAdjustments({ ...adjustments, removeBg: false })} className="text-xs text-red-400">×</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Generate */}
            <button onClick={generatePattern} disabled={!image || processing}
              className="w-full flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))", fontFamily: "var(--font-display)" }}>
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Upload className="h-4 w-4" /> Generate Pattern</>}
            </button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 overflow-auto">
              {pattern ? (
                <div className="flex justify-center">
                  <canvas ref={canvasRef} className="pixel-render max-w-full" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
                  <Grid3X3 className="h-16 w-16 mb-4" />
                  <p className="text-sm">Upload an image and click Generate</p>
                </div>
              )}
            </div>

            {pattern && (
              <div className="rounded-2xl border border-[var(--border)] p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    {t("gen.materials")} ({Object.keys(pattern.colorCounts).length} {t("common.colors")})
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => generatePDF(pattern, config.brand)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium hover:bg-[var(--surface-hover)]">
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </button>
                    <button onClick={() => { if (canvasRef.current) { const a = document.createElement("a"); a.download = "bead-pattern.png"; a.href = canvasRef.current.toDataURL(); a.click(); } }}
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}>
                      <Download className="h-3.5 w-3.5" /> PNG
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(pattern.colorCounts).sort((a, b) => b[1] - a[1]).map(([code, count]) => {
                    const bead = palette.colors.find(c => c[0] === code);
                    if (!bead) return null;
                    return (
                      <div key={code} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs">
                        <span className="h-4 w-4 rounded-sm shrink-0" style={{ backgroundColor: `rgb(${bead[2]},${bead[3]},${bead[4]})` }} />
                        <span className="truncate">{bead[1]}</span>
                        <span className="text-foreground/40 ml-auto">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
