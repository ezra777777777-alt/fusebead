import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.01]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="bead-gradient-text text-lg font-bold">
              FuseBead.art
            </span>
            <p className="mt-2 text-sm text-foreground/60">
              Free online Perler bead pattern maker. Convert any image to a
              printable bead pattern in seconds.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Tools</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><Link href="/generator" className="hover:text-foreground transition-colors">Pattern Generator</Link></li>
              <li><Link href="/editor" className="hover:text-foreground transition-colors">Pixel Editor</Link></li>
              <li><Link href="/converter" className="hover:text-foreground transition-colors">Color Converter</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><a href="mailto:hello@fusebead.art" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-foreground/40">
          <p>© 2026 FuseBead.art — Free for everyone.</p>
          <p>Crafted with ♥ for bead art lovers worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
