"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ImagePlus, Pencil, Upload, X, Loader2 } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { useAuth } from "@/lib/AuthContext";
import { usePro } from "@/lib/usePro";
import { PALETTES } from "@/lib/bead-colors";
import { processImage } from "@/lib/image-processor";
import { PublishFormModal } from "@/components/publish/PublishFormModal";
import { ProFeaturePrompt } from "@/components/shared/ProFeaturePrompt";

export function GalleryFAB() {
  const { t, lang } = useLang();
  const { user, openAuth } = useAuth();
  const { isPro, showPrompt, openPrompt, closePrompt } = usePro();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickPublishOpen, setQuickPublishOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gridData, setGridData] = useState<string[][] | null>(null);
  const [colorCounts, setColorCounts] = useState<Record<string, number> | null>(null);
  const [gridSize, setGridSize] = useState(50);
  const [brand, setBrand] = useState("perler");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAction = (action: string) => {
    setMenuOpen(false);
    if (!user) { openAuth(); return; }
    if (action === "generator") router.push("/generator");
    else if (action === "editor") router.push("/editor");
    else if (action === "quick") fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError(lang === "zh" ? "请上传图片文件" : "Please upload an image file");
      return;
    }
    setUploadError("");
    setUploading(true);
    setGridData(null);
    setColorCounts(null);

    try {
      // Read image
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      setPreviewUrl(url);

      // Process image — respect Pro limits
      const effGrid = isPro ? 50 : 29;

      const img = await new Promise<HTMLImageElement>((resolve) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.src = url;
      });

      const palette = PALETTES[brand]?.colors || PALETTES.perler.colors;
      const h = Math.round(effGrid * (img.height / img.width));
      const result = await processImage(img, effGrid, h, palette, undefined, true);

      // Convert bead codes to hex
      const hexGrid = result.grid.map(row =>
        row.map(code => {
          if (!code) return "";
          const bead = palette.find(c => c[0] === code);
          if (!bead) return "";
          const r = bead[2].toString(16).padStart(2, "0");
          const g = bead[3].toString(16).padStart(2, "0");
          const b = bead[4].toString(16).padStart(2, "0");
          return `#${r}${g}${b}`;
        })
      );

      const hexCounts: Record<string, number> = {};
      Object.entries(result.colorCounts).forEach(([code, count]) => {
        const bead = palette.find(c => c[0] === code);
        if (bead) {
          const r = bead[2].toString(16).padStart(2, "0");
          const g = bead[3].toString(16).padStart(2, "0");
          const b = bead[4].toString(16).padStart(2, "0");
          hexCounts[`#${r}${g}${b}`] = count;
        }
      });

      setGridData(hexGrid);
      setColorCounts(hexCounts);
      setGridSize(effGrid);
      setBrand("perler");
      setQuickPublishOpen(true);
    } catch {
      setUploadError(lang === "zh" ? "图片处理失败" : "Failed to process image");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/30"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu items */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-[125] flex flex-col gap-2"
          >
            {[
              { id: "quick", icon: Upload, label: t("gallery.fab.quickPublish"), desc: lang === "zh" ? "上传图片直接发布" : "Upload image & publish" },
              { id: "generator", icon: ImagePlus, label: t("gallery.fab.goGenerator"), desc: lang === "zh" ? "高级参数调节" : "Advanced settings" },
              { id: "editor", icon: Pencil, label: t("gallery.fab.goEditor"), desc: lang === "zh" ? "自由像素绘制" : "Draw pixel by pixel" },
            ].map((item) => (
              <motion.button
                key={item.id}
                onClick={() => handleAction(item.id)}
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-lg border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}>
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>{item.label}</p>
                  <p className="text-xs text-foreground/40">{item.desc}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed bottom-20 right-6 z-[130] w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))",
          transform: menuOpen ? "rotate(45deg)" : "rotate(0deg)",
        }}
      >
        <Plus className="h-7 w-7 text-white" />
      </button>

      {/* Upload loading overlay */}
      {uploading && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "var(--bead-coral)" }} />
            <p className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>{t("gallery.quick.processing")}</p>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="fixed bottom-36 right-6 z-[150] bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError("")}><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      {/* Quick Publish Modal */}
      {quickPublishOpen && gridData && colorCounts && (
        <PublishFormModal
          open={quickPublishOpen}
          onClose={() => { setQuickPublishOpen(false); setGridData(null); setColorCounts(null); setPreviewUrl(null); }}
          gridData={gridData}
          colorCounts={colorCounts}
          brand={brand}
          gridSize={gridSize}
        >
          {previewUrl && (
            <div className="rounded-xl border border-[var(--border)] p-3 bg-gray-50">
              <p className="text-xs text-foreground/40 mb-2">{t("gallery.quick.preview")}</p>
              <img src={previewUrl} alt="Preview" className="w-full h-32 object-contain rounded-lg" />
              <button
                onClick={() => { setGridData(null); setColorCounts(null); setPreviewUrl(null); setQuickPublishOpen(false); fileRef.current?.click(); }}
                className="text-xs text-[var(--primary)] hover:underline mt-2"
              >
                {t("gallery.quick.changeImage")}
              </button>
            </div>
          )}
        </PublishFormModal>
      )}
    </>
  );
}
