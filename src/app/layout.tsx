import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FuseBead.art — Free Perler Bead Pattern Maker",
  description:
    "Turn any image into a printable Perler / Artkal / Hama bead pattern. Free online tool with pixel editor, color matching, materials list, and PDF export.",
  keywords: [
    "perler beads", "fuse beads", "拼豆", "hama beads", "artkal",
    "bead pattern", "pixel art", "bead generator", "pattern maker",
  ],
  openGraph: {
    title: "FuseBead.art — Free Online Bead Pattern Maker",
    description:
      "Upload any image and convert it to a bead pattern in seconds. Supports Perler, Hama, Artkal, and MARD color palettes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
