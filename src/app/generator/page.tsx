"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Upload,
  ImagePlus,
  Download,
  Settings2,
  Grid3X3,
  Palette,
  X,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { PERLER_COLORS } from "@/lib/bead-colors";
import { processImage, type ProcessedPattern } from "@/lib/image-processor";

type Config = {
  gridSize: number;
  dithering: boolean;
  maxColors: number;
};

export default function GeneratorPage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pattern, setPattern] = useState<ProcessedPattern | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>({
    gridSize: 50,
    dithering: true,
    maxColors: 0,
  });
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WebP).");
      return;
    }
    setError(null);
    setPattern(null);

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
    setProcessing(true);
    setError(null);

    try {
      const colors = PERLER_COLORS as unknown as [string, string, number, number, number][];
      const h = Math.round(config.gridSize * (image.height / image.width));
      const result = await processImage(
        image,
        config.gridSize,
        h,
        colors,
        config.maxColors > 0 ? config.maxColors : undefined,
        config.dithering
      );
      setPattern(result);
    } catch {
      setError("Failed to process image. Try a different image.");
    } finally {
      setProcessing(false);
    }
  }, [image, config]);

  // Render pattern to canvas
  useEffect(() => {
    if (!pattern || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const colors = PERLER_COLORS as unknown as [string, string, number, number, number][];
    const pixelSize = 8;

    canvas.width = pattern.width * pixelSize;
    canvas.height = pattern.height * pixelSize;
    canvas.style.width = pattern.width * pixelSize + "px";
    canvas.style.height = pattern.height * pixelSize + "px";

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const code = pattern.grid[y][x];
        if (!code) continue;
        const c = colors.find((c) => c[0] === code);
        if (!c) continue;
        ctx.fillStyle = `rgb(${c[2]},${c[3]},${c[4]})`;
        ctx.fillRect(x * pixelSize + 1, y * pixelSize + 1, pixelSize - 2, pixelSize - 2);
      }
    }
  }, [pattern]);

  const exportPNG = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "bead-pattern.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, []);

  const clearImage = () => {
    setImage(null);
    setImageUrl(null);
    setPattern(null);
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2" style={{ fontFamily: "var(--font-display)" }}>
            <span className="bead-gradient-text">Pattern Generator</span>
          </h1>
          <p className="text-foreground/60">
            Upload an image and convert it into a Perler bead pattern instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Upload + Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Area */}
            <div
              ref={dropRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleImage(f);
              }}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                imageUrl
                  ? "border-green-500/30 bg-green-500/[0.02]"
                  : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.15] dark:hover:border-white/[0.15] hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
              }`}
            >
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="mx-auto max-h-48 rounded-lg pixel-render"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-foreground text-background hover:opacity-80 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <ImagePlus className="mx-auto h-10 w-10 text-foreground/30 mb-3" />
                  <p className="text-sm font-medium">Drop an image or click to upload</p>
                  <p className="text-xs text-foreground/40 mt-1">JPG, PNG, WebP</p>
                </>
              )}
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImage(f);
                }}
              />
            </div>

            {/* Settings */}
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-5 space-y-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center justify-between w-full text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Settings
                </span>
                <motion.span
                  animate={{ rotate: showSettings ? 180 : 0 }}
                  className="text-foreground/40"
                >
                  ▼
                </motion.span>
              </button>

              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/60 mb-1.5">
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Grid Size: {config.gridSize}×{Math.round(config.gridSize * (image?.height || 1) / (image?.width || 1))}
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={150}
                      value={config.gridSize}
                      onChange={(e) =>
                        setConfig({ ...config, gridSize: Number(e.target.value) })
                      }
                      className="w-full accent-foreground"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs text-foreground/60 mb-1.5">
                      <Palette className="h-3.5 w-3.5" />
                      Max Colors: {config.maxColors > 0 ? config.maxColors : "Unlimited"}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={2}
                      value={config.maxColors}
                      onChange={(e) =>
                        setConfig({ ...config, maxColors: Number(e.target.value) })
                      }
                      className="w-full accent-foreground"
                    />
                  </div>

                  <label className="flex items-center justify-between text-sm">
                    <span>Dithering</span>
                    <input
                      type="checkbox"
                      checked={config.dithering}
                      onChange={(e) =>
                        setConfig({ ...config, dithering: e.target.checked })
                      }
                      className="h-4 w-4 rounded accent-foreground"
                    />
                  </label>
                </motion.div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={generatePattern}
              disabled={!image || processing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ 
                background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))",
                fontFamily: "var(--font-display)",
              }}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Generate Pattern
                </>
              )}
            </button>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Right: Preview + Color List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Canvas */}
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] p-4 overflow-auto">
              {pattern ? (
                <div className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    className="pixel-render max-w-full"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/20">
                  <Grid3X3 className="h-16 w-16 mb-4" />
                  <p className="text-sm">Upload an image and click Generate</p>
                </div>
              )}
            </div>

            {/* Color List + Export */}
            {pattern && (
              <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    Materials List ({Object.keys(pattern.colorCounts).length} colors)
                  </h3>
                  <button
                    onClick={exportPNG}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PNG
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(pattern.colorCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([code, count]) => {
                      const c = (PERLER_COLORS as unknown as [string, string, number, number, number][]).find(
                        (c) => c[0] === code
                      );
                      if (!c) return null;
                      return (
                        <div
                          key={code}
                          className="flex items-center gap-2 rounded-lg border border-black/[0.04] dark:border-white/[0.04] px-2.5 py-1.5 text-xs"
                        >
                          <span
                            className="h-4 w-4 rounded-sm shrink-0"
                            style={{ backgroundColor: `rgb(${c[2]},${c[3]},${c[4]})` }}
                          />
                          <span className="truncate">{c[1]}</span>
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
