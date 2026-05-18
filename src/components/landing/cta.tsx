"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl px-6 py-16 sm:px-12 sm:py-20 text-center"
          style={{
            background: "linear-gradient(135deg, var(--bead-coral) 0%, var(--bead-amber) 50%, var(--bead-sunflower) 100%)",
          }}
        >
          {/* Decorative bead dots */}
          <div className="absolute inset-0 bead-dot-bg opacity-10" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to Make Something Beautiful?
            </h2>
            <p className="text-lg text-white/80 mb-8">
              No sign-up. No limits. Just upload your image and start creating 
              bead patterns in seconds.
            </p>
            <Link
              href="/generator"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                color: "var(--bead-coral)",
                fontFamily: "var(--font-display)",
              }}
            >
              Start Creating Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
