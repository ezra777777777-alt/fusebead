import type { Metadata } from "next";
import { Suspense } from "react";
import { GithubProjects } from "@/components/community/GithubProjects";

export const metadata: Metadata = {
  title: "资源分享",
  description: "分享真正用得上的 GitHub 项目：查找工具、阅读使用体验，也推荐你的发现。",
};

export default function GithubPage() {
  return <Suspense fallback={<p className="px-5 py-32 text-center">正在打开资源分享专区…</p>}><GithubProjects /></Suspense>;
}
