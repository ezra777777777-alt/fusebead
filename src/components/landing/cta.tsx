"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

export function CTA() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] px-8 py-12 sm:px-12 sm:py-16 overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10 blur-3xl" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to Start{" "}
            <span className="bead-gradient-text">Creating</span>?
          </h2>
          <p className="text-foreground/60 mb-8 max-w-lg mx-auto">
            No sign-up, no downloads, no cost. Just upload your image and
            start beading.
          </p>

          <Link
            href="/generator"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-base font-semibold text-background hover:opacity-90 transition-all hover:scale-[1.02]"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
