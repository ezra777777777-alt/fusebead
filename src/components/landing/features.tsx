"use client";

import { motion } from "framer-motion";
import { Upload, Palette, Download, Grid3X3, Sparkles, Zap } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Upload Any Image",
    description:
      "Drop in a photo, drawing, or screenshot. JPG, PNG, WebP — we handle them all. No size limits on the free tier.",
    gradient: "gradient-coral",
  },
  {
    icon: Grid3X3,
    title: "Smart Color Matching",
    description:
      "60 authentic Perler colors with weighted color-distance matching. Floyd-Steinberg dithering for smooth gradients.",
    gradient: "gradient-mint",
  },
  {
    icon: Palette,
    title: "Adjust & Preview",
    description:
      "Tweak grid size from 20 to 150 beads wide. Limit colors. Toggle dithering. See your pattern update in real-time.",
    gradient: "gradient-warm",
  },
  {
    icon: Download,
    title: "Materials List + Export",
    description:
      "Get a bead-by-bead count for every color. Export as PNG to take to your craft table. PDF export coming soon.",
    gradient: "gradient-coral",
  },
  {
    icon: Sparkles,
    title: "Multi-Brand Support",
    description:
      "Perler today, Hama tomorrow. Artkal and MARD color converters in the works. One pattern, any bead brand.",
    gradient: "gradient-mint",
  },
  {
    icon: Zap,
    title: "Free & Unlimited",
    description:
      "No sign-up. No credit card. No watermarks. Generate as many patterns as you want. Craft without limits.",
    gradient: "gradient-warm",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From Photo to{" "}
            <span className="bead-gradient-text">Bead Pattern</span> in Seconds
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Everything you need to turn your favorite images into bead art.
            No design skills required — just upload and create.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-transparent hover:shadow-lg transition-all duration-300"
            >
              {/* Gradient icon */}
              <div
                className={`inline-flex rounded-xl ${feature.gradient} p-3 text-white mb-4`}
              >
                <feature.icon className="h-5 w-5" />
              </div>

              <h3 
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {feature.title}
              </h3>
              <p className="text-sm text-foreground/60 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
