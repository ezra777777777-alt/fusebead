"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, MessageCircle, Search, ThumbsUp } from "lucide-react";
import { api } from "@/lib/api";
import { categoryLabel, Project, serverDate } from "@/lib/community";
import { approvedWorksOnly, LoadState, loadingState, runRequest } from "@/lib/load-state";
import { LoadFailure, LoadingSkeleton } from "@/components/shared/LoadState";
import { Pagination } from "@/components/shared/Pagination";

const PAGE_SIZE = 12;
const FALLBACK = "暂时无法读取已审核作品，请稍后再试";

type Payload = { projects: Project[]; total: number };

export function ApprovedWorks() {
  const params = useSearchParams();
  const search = params.get("search") || "";
  const sort = ["latest", "popular", "discussed"].includes(params.get("sort") || "") ? params.get("sort")! : "latest";
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [state, setState] = useState<LoadState<Payload>>(loadingState());
  const [retry, setRetry] = useState(0);

  const changeFilters = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || (key === "page" && value === "1") || (key === "sort" && value === "latest")) next.delete(key);
      else next.set(key, value);
    }
    window.history.replaceState(null, "", `/works${next.size ? `?${next}` : ""}`);
  };

  useEffect(() => {
    let active = true;
    setState(loadingState());
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ sort, search: search.trim(), page: String(page), limit: String(PAGE_SIZE) });
      void runRequest(async () => {
        const data = await api<{ projects: Project[]; total: number }>(`/projects?${query}`);
        return { projects: approvedWorksOnly(data.projects), total: Number(data.total) || 0 };
      }, FALLBACK).then(next => { if (active) setState(next); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, sort, page, retry]);

  const projects = state.data?.projects ?? [];
  const total = state.data?.total ?? 0;
  const retryLoad = () => setRetry(value => value + 1);

  return (
    <div className="min-h-screen bg-[var(--background)] pt-16 text-black">
      <section className="cyber-hero border-b-4 border-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="inline-flex items-center gap-2 border-2 border-black bg-[var(--acid)] px-3 py-1 text-xs font-black tracking-widest text-black">
            <BadgeCheck className="h-4 w-4" /> APPROVED ONLY · 已审核
          </p>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">已审核作品</h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/70">
            这里只展示已通过审核、且未下架的公开作品。待审核、需修改、已撤回和已下架的内容不会出现。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-widest text-[var(--orange)]">PUBLIC WORKS</p>
            <h2 className="mt-1 text-2xl font-black">过检清单</h2>
            <p aria-live="polite" className="mt-2 text-sm text-black/55">
              {state.phase === "loading" ? "正在读取已审核作品…" : state.phase === "error" ? "列表暂时没有加载出来" : `${total} 份已审核作品`}
            </p>
          </div>
          <label className="flex min-w-0 items-center gap-2 border-2 border-black bg-white px-3 py-3 shadow-[3px_3px_0_#000] sm:w-80">
            <Search className="h-4 w-4 shrink-0" />
            <input aria-label="搜索已审核作品" value={search} onChange={event => changeFilters({ search: event.target.value, page: "1" })} maxLength={80} placeholder="搜标题、简介或作者" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        <div className="my-5 flex flex-wrap items-center gap-3 border-y-2 border-black py-3 text-sm font-bold">
          <label>排序
            <select aria-label="作品排序" value={sort} onChange={event => changeFilters({ sort: event.target.value, page: "1" })} className="ml-2 bg-transparent">
              <option value="latest">最新通过</option>
              <option value="popular">最多点赞</option>
              <option value="discussed">最多评论</option>
            </select>
          </label>
          {(search || page > 1 || sort !== "latest") && <button type="button" onClick={() => changeFilters({ search: "", sort: "latest", page: "1" })} className="ml-auto underline">清除筛选</button>}
        </div>

        {state.phase === "error" ? <LoadFailure message={state.error || FALLBACK} onRetry={retryLoad} /> : state.phase === "loading" || state.skeleton ? <LoadingSkeleton label="正在读取已审核作品…" /> : projects.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map(project => (
              <article key={project.id} className="flex min-w-0 flex-col border-2 border-black bg-white p-5 shadow-[5px_5px_0_#000]">
                <div className="flex items-center gap-2 text-xs font-black text-[var(--orange)]">
                  <span>{categoryLabel(project.category)}</span>
                  <span className="ml-auto border border-black bg-[var(--acid)] px-1.5 py-0.5 text-[10px] text-black">已审核</span>
                </div>
                <h3 className="mt-4 [overflow-wrap:anywhere] text-xl font-black">
                  <Link href={`/projects/${project.id}`} className="hover:text-[var(--orange)]">{project.title}</Link>
                </h3>
                <p className="mt-3 flex-1 [overflow-wrap:anywhere] text-sm leading-7 text-black/65">{project.summary}</p>
                <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 border-t border-black/15 pt-3 text-xs text-black/55">
                  <Link href={`/user/${project.user_id}`} className="[overflow-wrap:anywhere] hover:underline">{project.author_name || "匿名搬运工"}</Link>
                  <time>{serverDate(project.created_at).toLocaleDateString("zh-CN")}</time>
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{project.votes_count}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{project.comments_count}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-black/35 bg-white px-5 py-14 text-center">
            <BadgeCheck className="mx-auto h-10 w-10 text-black/30" />
            <h3 className="mt-4 text-xl font-black">{search || page > 1 ? "没有找到匹配的已审核作品" : "还没有已通过审核的作品"}</h3>
            <p className="mt-3 text-sm leading-6 text-black/55">待审核和未通过的投稿不会出现在这里。</p>
            <Link href="/submit" className="mt-5 inline-flex font-black underline">去投稿</Link>
          </div>
        )}
        {state.phase === "ready" && total > PAGE_SIZE && <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onChange={value => changeFilters({ page: String(value) })} />}
      </section>
    </div>
  );
}
