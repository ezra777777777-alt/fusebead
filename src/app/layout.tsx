import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AuthModal } from "@/components/auth/AuthModal";

export const metadata: Metadata = {
  title: "FuseBead.art — Free Perler Bead Pattern Maker | 免费拼豆图案生成器",
  description: "Turn any image into a printable Perler / Artkal / Hama bead pattern. 上传图片即可生成拼豆图案，免费在线工具。",
  keywords: ["perler beads", "fuse beads", "拼豆", "hama beads", "artkal", "bead pattern", "pixel art"],
  openGraph: { title: "FuseBead.art — Free Online Bead Pattern Maker", description: "Upload any image and convert it to a bead pattern in seconds.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>
          <LangProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <AuthModal />
          </LangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
