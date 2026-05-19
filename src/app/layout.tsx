import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AuthModal } from "@/components/auth/AuthModal";

export const metadata: Metadata = {
  metadataBase: new URL("https://fusebead.vercel.app"),
  title: {
    default: "FuseBead.art — Free Perler Bead Pattern Maker | 免费拼豆图案生成器",
    template: "%s | FuseBead.art",
  },
  description: "Turn any image into a printable Perler / Artkal / Hama bead pattern. Free online tool with pixel editor, color matching, and PDF export. 上传图片即可生成拼豆图案。",
  keywords: ["perler beads", "fuse beads", "拼豆", "hama beads", "artkal", "bead pattern maker", "pixel art converter", "bead generator", "pattern maker", "free bead tool"],
  authors: [{ name: "FuseBead" }],
  creator: "FuseBead.art",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fusebead.vercel.app",
    siteName: "FuseBead.art",
    title: "FuseBead.art — Free Online Bead Pattern Maker",
    description: "Upload any image and convert it to a bead pattern in seconds. Supports Perler, Hama, Artkal, and MARD color palettes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FuseBead.art — Free Bead Pattern Maker",
    description: "Turn any photo into a bead pattern instantly. Free, no sign-up.",
  },
  robots: { index: true, follow: true },
  alternates: {
    languages: { "en": "https://fusebead.vercel.app", "zh": "https://fusebead.vercel.app" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
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
