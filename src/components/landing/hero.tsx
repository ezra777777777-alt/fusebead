"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ArrowRight, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background bead dot pattern */}
      <div className="absolute inset-0 bead-dot-bg opacity-[0.03]" />

      {/* Floating bead orbs */}
      <motion.div
        className="absolute top-20 left-[10%] w-72 h-72 rounded-full opacity-[0.06]"
        style={{ background: "var(--bead-coral)" }}
        animate={{ y: [0, -30, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-32 right-[5%] w-96 h-96 rounded-full opacity-[0.04]"
        style={{ background: "var(--bead-mint)" }}
        animate={{ y: [0, 20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{ background: "var(--bead-sunflower)" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm mb-8"
          >
            <Sparkles className="h-4 w-4" style={{ color: "var(--bead-amber)" }} />
            <span className="text-foreground/70">Free &amp; open-source</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Turn{" "}
            <span className="bead-gradient-text">Any Image</span>
            <br />
            into Bead Art
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-foreground/60 max-w-xl mb-10 leading-relaxed"
          >
            Upload a photo, pick your bead brand, and get a pixel-perfect pattern with 
            color-matched materials list. No sign-up. No limits. Just beads.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              href="/generator"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))",
                fontFamily: "var(--font-display)",
              }}
            >
              Start Creating
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-8 py-3.5 text-base font-semibold text-foreground/80 hover:bg-[var(--surface-hover)] transition-all font-[family-name:var(--font-display)]"
            >
              <Play className="h-4 w-4" />
              How It Works
            </Link>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center gap-6 text-sm text-foreground/40"
          >
            <span>✨ No sign-up required</span>
            <span className="hidden sm:inline">•</span>
            <span>🎨 60+ Perler colors</span>
            <span className="hidden sm:inline">•</span>
            <span>📦 Free PNG export</span>
            <span className="hidden sm:inline">•</span>
            <span>🖥️ Works in browser</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
