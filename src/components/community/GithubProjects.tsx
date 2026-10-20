"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Code2, MessageCircle, Plus, Search, ThumbsUp } from "lucide-react";
import { api } from "@/lib/api";
import { approvedWorksOnly, failureReason } from "@/lib/load-state";
import { LoadingSkeleton } from "@/components/shared/LoadState";
import { GITHUB_CATEGORY, Project, serverDate } from "@/lib/community";
import { Pagination } from "@/components/shared/Pagination";

export function GithubProjects() {
  const params = useSearchParams();
  const search = params.get("search") || "";
  const sort = ["latest", "popular", "discussed"].includes(params.get("sort") || "") ? params.get("sort")! : "latest";
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const submitHref = `/submit?category=${encodeURIComponent(GITHUB_CATEGORY)}`;
  const changeFilters = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value || (key === "page" && value === "1")) next.delete(key);
      else next.set(key, value);
    }
    window.history.replaceState(null, "", `/github${next.size ? `?${next}` : ""}#projects`);
  };

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ category: GITHUB_CATEGORY, search: search.trim(), sort, page: String(page), limit: "12" });
      api<{ projects: Project[]; total: number }>(`/projects?${query}`)
        .then(data => { if (active) { setProjects(approvedWorksOnly(data.projects)); setTotal(data.total); } })
        .catch(e => { if (active) setError(failureReason(e, "暂时无法读取项目")); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, sort, page, retry]);

  return <div className="min-h-screen bg-[var(--background)] pt-16 text-black">
    <section className="cyber-hero border-b-4 border-black text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8 lg:py-16">
        <div>
          <p className="inline-flex items-center gap-2 border-2 border-black bg-[var(--acid)] px-3 py-1 text-xs font-black tracking-widest text-black"><Code2 className="h-4 w-4" /> RESOURCE SHARING · 资源分享</p>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-6xl">这栏，<br /><span className="text-[var(--acid)]">真有点用。</span></h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/65">开发工具、效率神器、学习资源。把你在 GitHub 上发现的好项目，连同“怎么用、好在哪”一起分享出来。</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={submitHref} className="cyber-button bg-[var(--orange)] text-white"><Plus className="h-5 w-5" /> 分享资源</Link>
            <a href="#projects" className="cyber-button bg-white text-black"><Search className="h-5 w-5" /> 逛逛资源</a>
          </div>
        </div>
        <aside className="self-center border-2 border-black bg-[#fff7d6] p-5 text-black shadow-[7px_7px_0_var(--orange)]">
          <p className="font-mono text-xs font-bold text-black/50">GOOD TOOLS / REAL EXPERIENCE</p>
          <h2 className="mt-3 text-xl font-black">贴个链接，再说两句。</h2>
          <ol className="mt-4 space-y-3 text-sm font-semibold leading-6 text-black/65">
            <li>01 / 分享公开仓库，保留原作者出处。</li>
            <li>02 / 说明用途、上手方法和使用限制。</li>
            <li>03 / 审核通过后公开，大家一起补充体验。</li>
          </ol>
          <Link href="/help#github" className="mt-5 inline-flex items-center gap-2 text-sm font-black underline">查看分享说明 <ArrowRight className="h-4 w-4" /></Link>
        </aside>
      </div>
    </section>

    <section id="projects" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-9 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black tracking-widest text-[var(--orange)]">COMMUNITY PICKS</p><h2 className="mt-1 text-2xl font-black">资源分享</h2><p aria-live="polite" className="mt-2 text-sm text-black/55">{loading ? "正在查找项目…" : error ? "项目暂时未加载" : `${total} 个已审核项目`}</p></div>
        <label className="flex min-w-0 items-center gap-2 border-2 border-black bg-white px-3 py-3 shadow-[3px_3px_0_#000] sm:w-80"><Search className="h-4 w-4 shrink-0" /><input aria-label="搜索资源" value={search} onChange={e => changeFilters({ search: e.target.value, page: "1" })} maxLength={80} placeholder="搜用途、技术栈或仓库名" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      </div>
      <div className="my-5 flex flex-wrap items-center gap-3 border-y-2 border-black py-3 text-sm font-bold">
        <label>排序 <select aria-label="资源排序" value={sort} onChange={e => changeFilters({ sort: e.target.value, page: "1" })} className="ml-2 bg-transparent"><option value="latest">最新分享</option><option value="popular">最多点赞</option><option value="discussed">最多讨论</option></select></label>
        {(search || page > 1) && <button onClick={() => changeFilters({ search: "", page: "1" })} className="ml-auto underline">清除筛选</button>}
      </div>
      {error ? <div role="alert" data-phase="error" className="border-2 border-black bg-white p-10 text-center"><p className="font-black">没有加载成功</p><p className="mt-2 text-sm font-semibold text-black/70">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black">重试</button></div> : loading ? <LoadingSkeleton label="正在读取分享…" /> : projects.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map(project => <article key={project.id} className="flex min-w-0 flex-col border-2 border-black bg-white p-5 shadow-[5px_5px_0_#000]">
          <div className="flex items-center gap-2 text-xs font-bold text-black/55"><Code2 className="h-5 w-5 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">{project.repo_url?.replace("https://github.com/", "")}</span>{!!project.is_featured && <span className="ml-auto shrink-0 bg-[var(--acid)] px-2 py-1 text-black">推荐</span>}</div>
          <h3 className="mt-4 [overflow-wrap:anywhere] text-xl font-black"><Link href={`/projects/${project.id}?from=github&feed=${encodeURIComponent(params.toString())}`} className="hover:text-[var(--orange)]">{project.title}</Link></h3>
          <p className="mt-3 flex-1 [overflow-wrap:anywhere] text-sm leading-7 text-black/65">{project.summary}</p>
          {project.tech_stack && <p className="mt-4 border-l-4 border-[var(--acid)] pl-3 [overflow-wrap:anywhere] text-xs font-bold">{project.tech_stack}</p>}
          <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 border-t border-black/15 pt-3 text-xs text-black/55"><Link href={`/user/${project.user_id}`} className="[overflow-wrap:anywhere] hover:underline">分享者：{project.author_name}</Link><time>{serverDate(project.created_at).toLocaleDateString("zh-CN")}</time><span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{project.votes_count}</span><span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{project.comments_count}</span></div>
        </article>)}
      </div> : <div className="border-2 border-dashed border-black/35 bg-white px-5 py-14 text-center"><Code2 className="mx-auto h-10 w-10 text-black/30" /><h3 className="mt-4 text-xl font-black">{search || page > 1 ? "没有找到匹配的项目" : "专区开张，等你分享第一个好项目"}</h3><p className="mt-3 text-sm leading-6 text-black/55">{search || page > 1 ? "换个关键词，或者清除筛选再看看。" : "推荐自己做的，也推荐别人做的；说清楚它帮你解决了什么。"}</p><Link href={submitHref} className="mt-5 inline-flex font-black underline">分享一个资源 →</Link></div>}
      {!error && !loading && total > 12 && <Pagination page={page} totalPages={Math.ceil(total / 12)} onChange={value => changeFilters({ page: String(value) })} />}
    </section>
  </div>;
}
