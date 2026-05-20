"use client";

import { Crown } from "lucide-react";

export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white ${className}`}
      style={{ background: "linear-gradient(135deg, #f59e0b, #eab308)", fontFamily: "var(--font-display)" }}
    >
      <Crown className="h-2.5 w-2.5" /> Pro
    </span>
  );
}
