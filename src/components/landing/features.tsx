"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ImagePlus,
  Pencil,
  Palette,
  FileDown,
  ShoppingBag,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: ImagePlus,
    title: "Image to Pattern",
    description:
      "Upload any JPG, PNG, or WebP image and get an instant bead pattern. Smart color matching maps each pixel to real bead colors.",
    color: "from-rose-500 to-orange-500",
  },
  {
    icon: Pencil,
    title: "Built-in Pixel Editor",
    description:
      "Fine-tune your pattern with draw, fill, erase, and color replace tools. Full undo/redo support — edit until it's perfect.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Palette,
    title: "Multi-Brand Palettes",
    description:
      "Switch between Perler, Hama, Artkal S, MARD, COCO, and more. 420+ colors across all brands — every pixel stays accurate.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: FileDown,
    title: "PDF & Image Export",
    description:
      "Download print-ready PDF with color codes, grid lines, and board layout. Or export as high-res PNG for sharing online.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: ShoppingBag,
    title: "Materials List",
    description:
      "Get exact counts of every bead color you need. Know how many packs to buy — no more guessing or running out mid-project.",
    color: "from-amber-500 to-yellow-500",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "All processing happens in your browser. Your images never leave your device — complete privacy, instant results.",
    color: "from-indigo-500 to-violet-500",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-background p-6 sm:p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div
        className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white mb-4`}
      >
        <feature.icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
      <p className="text-sm text-foreground/60 leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function Features() {
  return (
    <section className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything You Need to{" "}
            <span className="bead-gradient-text">Create</span>
          </h2>
          <p className="text-foreground/60 max-w-xl mx-auto">
            From idea to finished artwork — all the tools a bead artist needs,
            in one place.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
