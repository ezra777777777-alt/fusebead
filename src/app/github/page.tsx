import type { Metadata } from "next";
import { Suspense } from "react";
import { GithubProjects } from "@/components/community/GithubProjects";
import { LoadingSkeleton } from "@/components/shared/LoadState";

export const metadata: Metadata = {
  title: "资源分享",
  description: "分享真正用得上的 GitHub 项目：查找工具、阅读使用体验，也推荐你的发现。",
};

export default function GithubPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--background)] px-4 pt-24"><LoadingSkeleton label="正在打开资源分享专区…" /></div>}><GithubProjects /></Suspense>;
}
