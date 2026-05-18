import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";

export default function EditorPage() {
  return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <div className="text-center px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <Pencil className="h-16 w-16 mx-auto text-foreground/20 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Pixel Editor</h1>
        <p className="text-foreground/60">Coming soon. Fine-tune your patterns with draw, fill, and erase tools.</p>
      </div>
    </div>
  );
}
