"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/generator", label: "Generator" },
  { href: "/editor", label: "Editor" },
  { href: "/converter", label: "Converter" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-lg">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span
              className="text-2xl"
              role="img"
              aria-label="bead"
            >
              🔴🟠🟡🟢🔵
            </span>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              FuseBead<span className="text-[var(--bead-coral)]">.art</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/generator"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))",
                fontFamily: "var(--font-display)",
              }}
            >
              Start Creating
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--surface-hover)]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)] space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/generator"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, var(--bead-coral), var(--bead-amber))",
                fontFamily: "var(--font-display)",
              }}
            >
              Start Creating
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
