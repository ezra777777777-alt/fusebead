import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span className="text-xl" role="img" aria-label="bead">🧶</span>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                FuseBead<span className="text-[var(--bead-coral)]">.art</span>
              </span>
            </Link>
            <p className="text-sm text-foreground/50 leading-relaxed">
              Free online Perler bead pattern maker. Turn any image into a 
              printable bead pattern in seconds.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 
              className="text-sm font-semibold mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Tools
            </h4>
            <div className="space-y-2">
              <Link href="/generator" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                Pattern Generator
              </Link>
              <Link href="/editor" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                Pixel Editor
              </Link>
              <Link href="/converter" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                Color Converter
              </Link>
            </div>
          </div>

          {/* About */}
          <div>
            <h4 
              className="text-sm font-semibold mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              About
            </h4>
            <p className="text-sm text-foreground/50 leading-relaxed">
              Built with love for the bead art community. Support for Perler, 
              Hama, Artkal, and MARD color palettes. More coming soon.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground/40">
            &copy; {new Date().getFullYear()} FuseBead.art — Free for everyone.
          </p>
          <p className="text-xs text-foreground/40 flex items-center gap-1">
            Made with <Heart className="h-3 w-3" style={{ color: "var(--bead-coral)" }} /> for the craft community
          </p>
        </div>
      </div>
    </footer>
  );
}
