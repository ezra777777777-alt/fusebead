import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://fusebead.cn"),
  title: {
    default: "赛博搬屎 — Vibe Coding 电子垃圾联合投喂平台",
    template: "%s | 赛博搬屎",
  },
  description: "全国 Vibe Coding 屎山统一收容点。分享奇葩软件、网页小玩具和 AI 套壳项目，让网友在线试用、锐评和贡献审核。",
  keywords: ["vibe coding", "独立开发", "奇葩软件", "软件社区", "AI 编程", "网页工具"],
  authors: [{ name: "赛博搬屎" }],
  creator: "赛博搬屎",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://fusebead.cn",
    siteName: "赛博搬屎",
    title: "赛博搬屎 — Vibe Coding 电子垃圾联合投喂平台",
    description: "你负责现拉，我们负责端给网友。",
  },
  twitter: {
    card: "summary_large_image",
    title: "赛博搬屎",
    description: "你负责现拉，我们负责端给网友。",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>
          <LangProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <AuthModal />
            <FeedbackButton />
          </LangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
