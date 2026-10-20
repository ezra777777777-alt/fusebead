import type { Metadata } from "next";
import { Suspense } from "react";
import { ApprovedWorks } from "@/components/community/ApprovedWorks";
import { LoadingSkeleton } from "@/components/shared/LoadState";

export const metadata: Metadata = {
  title: "已审核作品",
  description: "只展示已通过审核、尚未下架的公开作品。待审核、未通过和已下架的内容不会出现。",
};

export default function WorksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] px-4 pt-24"><LoadingSkeleton label="正在读取已审核作品…" /></div>}>
      <ApprovedWorks />
    </Suspense>
  );
}
