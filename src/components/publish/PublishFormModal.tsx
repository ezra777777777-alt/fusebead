"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Share2, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { api } from "@/lib/api";

interface PublishFormModalProps {
  open: boolean;
  onClose: () => void;
  gridData: string[][];
  colorCounts: Record<string, number>;
  brand: string;
  gridSize: number;
  /** Optional children rendered above the form (e.g. image preview) */
  children?: React.ReactNode;
}

export function PublishFormModal({ open, onClose, gridData, colorCounts, brand, gridSize, children }: PublishFormModalProps) {
  const { t, lang } = useLang();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handlePublish = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api("/patterns", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || null,
          brand,
          gridSize,
          gridData,
          colorCounts,
          isPublic: true,
        }),
      });
      setDone(true);
    } catch {
      setError(lang === "zh" ? "发布失败，请重试" : "Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100 z-10">
          <X className="h-4 w-4 text-gray-400" />
        </button>

        {done ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-semibold text-lg" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "zh" ? "已发布！" : "Published!"}
            </p>
            <Link
              href="/gallery"
              onClick={onClose}
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-white rounded-full px-5 py-2.5"
              style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
            >
              {lang === "zh" ? "去图纸库查看" : "View in Gallery"} →
            </Link>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
              {lang === "zh" ? "发布到图纸库" : "Publish to Gallery"}
            </h3>

            {children}

            <div className="space-y-3 mt-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === "zh" ? "给图案起个名字..." : "Give your pattern a name..."}
                maxLength={100}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]"
                autoFocus
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">{lang === "zh" ? "选择分类" : "Select category"}</option>
                {["cute", "anime", "animals", "cartoon", "landscape", "characters", "holiday"].map(c => (
                  <option key={c} value={c}>{t(`gallery.categories.${c}`)}</option>
                ))}
              </select>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === "zh" ? "描述（选填）" : "Description (optional)"}
                maxLength={500}
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handlePublish}
                disabled={loading || !title.trim()}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))" }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Share2 className="h-4 w-4" />
                {loading ? (lang === "zh" ? "发布中..." : "Publishing...") : (lang === "zh" ? "发布" : "Publish")}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
