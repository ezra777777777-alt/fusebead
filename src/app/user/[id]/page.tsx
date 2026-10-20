"use client";

import { categoryLabel, serverDate } from "@/lib/community";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { ContentLoginPrompt } from "@/components/auth/ContentLoginPrompt";
import { approvedWorksOnly, errorState, loadingState, presentLoad, readyState, runRequest, unauthorizedState } from "@/lib/load-state";
import { LoadFailure, LoadingSkeleton } from "@/components/shared/LoadState";
import { Project } from "@/lib/community";
import { Pagination } from "@/components/shared/Pagination";
import BeadProfile from "@/components/dashboard/BeadProfile";

export default function UserProfile() {
  const { id } = useParams<{id:string}>();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [authDenied, setAuthDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [beads, setBeads] = useState(false);
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); setProjects([]); setProfile(null); setError(""); setAuthDenied(false); return; }
    let active = true;
    setLoading(true); setError(""); setAuthDenied(false);
    void runRequest(async () => {
      const [profileUser, data] = await Promise.all([
        api<any>(`/user/profile/${id}`),
        api<{ projects: Project[]; total: number }>(`/projects?authorId=${id}&page=${page}&limit=12`),
      ]);
      return { profile: profileUser, projects: approvedWorksOnly(data.projects), total: Number(data.total) || 0 };
    }, "暂时无法读取作者档案").then(result => {
      if (!active) return;
      if (result.phase === "unauthorized") {
        setAuthDenied(true);
        setProfile(null);
        setProjects([]);
        setTotal(0);
        setError("");
        return;
      }
      setAuthDenied(false);
      if (result.phase !== "ready" || !result.data) {
        setProfile(null);
        setProjects([]);
        setError(result.error || "暂时无法读取作者档案");
        return;
      }
      setProfile(result.data.profile);
      setProjects(result.data.projects);
      setTotal(result.data.total);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, page, user, authLoading, retry]);
  const listState = !user || authDenied
    ? unauthorizedState<Project[]>()
    : error
      ? errorState<Project[]>(error, "暂时无法读取作者档案")
      : loading
        ? loadingState<Project[]>()
        : readyState(projects);
  const listView = presentLoad(listState, !!user && !authDenied);
  if (authLoading) return <p className="px-5 py-32 text-center font-black">正在确认登录状态…</p>;
  if (listView === "login") return <div data-phase="login" className="min-h-[70vh] px-5 pt-28"><div className="mx-auto max-w-3xl"><ContentLoginPrompt title="这位作者的作品需要登录" detail="未登录时不读取作品列表、图纸缩略图和评论。登录后回到这个主页。" returnTo={`/user/${id}`} /></div></div>;
  return <div className="min-h-[70vh] px-5 pb-12 pt-28 text-black"><div className="mx-auto max-w-5xl">
    <Link href="/" className="text-sm font-bold underline">← 返回社区</Link>
    {listView === "retry" ? <div className="my-8"><LoadFailure message={listState.error || "暂时无法读取作者档案"} onRetry={() => setRetry(value => value + 1)} /></div> : listView === "skeleton" ? <div className="my-8"><LoadingSkeleton label="正在读取作者档案…" /></div> : profile && <>
      <header className="my-7 flex flex-wrap items-center gap-5 border-2 border-black bg-white p-7 shadow-[6px_6px_0_#000]">
        <div className="flex shrink-0 h-20 w-20 items-center justify-center overflow-hidden border-2 border-black bg-black text-3xl font-black text-[var(--acid)]">{profile.avatar_url ? <img src={profile.avatar_url} alt="作者头像" className="h-full w-full object-cover" /> : profile.username.slice(0,1)}</div>
        <div className="min-w-0 flex-1"><h1 className="[overflow-wrap:anywhere] text-3xl font-black">{profile.username}</h1><p className="mt-2 text-sm text-black/55">{profile.projectCount} 份公开作品 · {profile.projectVotes} 个赞 · {profile.contribution_points} 清运值</p><p className="mt-2 text-xs text-black/40">加入于 {serverDate(profile.created_at).toLocaleDateString("zh-CN")}</p></div>
      </header>
      <div className="mb-6 flex gap-3"><button onClick={() => setBeads(false)} className={`border-2 border-black px-4 py-2 font-black ${!beads ? "bg-[var(--acid)]" : "bg-white"}`}>社区作品</button><button onClick={() => setBeads(true)} className={`border-2 border-black px-4 py-2 font-black ${beads ? "bg-[var(--acid)]" : "bg-white"}`}>拼豆图纸</button></div>
      {beads ? <BeadProfile /> : <>{projects.length ? <div className="grid gap-5 sm:grid-cols-2">{projects.map(project => <Link key={project.id} href={`/projects/${project.id}`} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000] hover:-translate-y-1"><span className="text-xs font-black text-[var(--orange)]">{categoryLabel(project.category)}</span><h2 className="mt-3 [overflow-wrap:anywhere] text-xl font-black">{project.title}</h2><p className="mt-3 [overflow-wrap:anywhere] text-sm text-black/60">{project.summary}</p><p className="mt-5 text-xs font-bold">{project.votes_count} 赞 · {project.comments_count} 条评论</p></Link>)}</div> : <p className="border-2 border-dashed p-16 text-center">作者还没有公开的社区作品。</p>}{total > 12 && <Pagination page={page} totalPages={Math.ceil(total / 12)} onChange={setPage} />}</>}
    </>}
  </div></div>;
}
