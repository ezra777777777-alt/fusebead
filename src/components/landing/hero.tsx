"use client";

import { useRef, useMemo } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Upload, Sparkles, Palette } from "lucide-react";

const BEAD_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#a855f7", "#ec4899", "#06b6d4",
  "#f43f5e", "#84cc16", "#14b8a6", "#8b5cf6",
];

function FloatingBead({ color, x, y, delay, size }: {
  color: string; x: number; y: number; delay: number; size: number;
}) {
  return (
    <motion.div
      className="absolute rounded pointer-events-none"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        boxShadow: `0 0 ${size}px ${color}40`,
      }}
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{
        opacity: [0, 0.8, 0.3, 0.8, 0],
        scale: [0, 1, 0.9, 1, 0],
        y: [20, 0, -10, 0, -30],
      }}
      transition={{
        duration: 3 + Math.random() * 2,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 3,
        ease: "easeInOut",
      }}
    />
  );
}

function BeadParticles() {
  const beads = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        color: BEAD_COLORS[i % BEAD_COLORS.length],
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 4,
        size: 4 + Math.random() * 8,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      {beads.map((b) => (
        <FloatingBead key={b.id} {...b} />
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-20 overflow-hidden"
    >
      <BeadParticles />

      <motion.div style={{ y, opacity }} className="relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-background/80 backdrop-blur px-4 py-1.5 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Free &amp; Open Source — No sign-up required
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05]"
          >
            Turn{" "}
            <span className="bead-gradient-text">Any Image</span>
            <br />
            Into a{" "}
            <span className="bead-gradient-text">Bead Pattern</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed"
          >
            Upload a photo and get a pixel-perfect Perler bead pattern in seconds.
            Supports Perler, Hama, Artkal &amp; MARD color palettes — right in your
            browser.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/generator"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-base font-semibold text-background hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              <Upload className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
              Upload Your Image
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-background/80 backdrop-blur px-8 py-4 text-base font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
            >
              <Palette className="h-5 w-5" />
              Open Pixel Editor
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={itemVariants}
            className="mt-14 flex items-center justify-center gap-8 text-xs text-foreground/40 flex-wrap"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              4 Brand Palettes
            </span>
            <span>•</span>
            <span>420+ Colors</span>
            <span>•</span>
            <span>100% Private</span>
            <span>•</span>
            <span>PDF Export</span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
