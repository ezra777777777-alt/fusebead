"use client";

import { categoryLabel, serverDate } from "@/lib/community";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { approvedWorksOnly } from "@/lib/load-state";
import { Project } from "@/lib/community";
import { Pagination } from "@/components/shared/Pagination";
import BeadProfile from "@/components/dashboard/BeadProfile";

export default function UserProfile() {
  const { id } = useParams<{id:string}>();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [beads, setBeads] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([api(`/user/profile/${id}`), api(`/projects?authorId=${id}&page=${page}&limit=12`)]).then(([user, data]) => {
      if (active) { setProfile(user); setProjects(approvedWorksOnly(data.projects)); setTotal(data.total); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, page]);
  return <div className="min-h-[70vh] px-5 pb-12 pt-28 text-black"><div className="mx-auto max-w-5xl">
    <Link href="/" className="text-sm font-bold underline">← 返回社区</Link>
    {error ? <p role="alert" className="my-8 border-2 border-red-500 p-5">{error}</p> : loading ? <p className="py-20 text-center">正在读取作者档案…</p> : profile && <>
      <header className="my-7 flex flex-wrap items-center gap-5 border-2 border-black bg-white p-7 shadow-[6px_6px_0_#000]">
        <div className="flex shrink-0 h-20 w-20 items-center justify-center overflow-hidden border-2 border-black bg-black text-3xl font-black text-[var(--acid)]">{profile.avatar_url ? <img src={profile.avatar_url} alt="作者头像" className="h-full w-full object-cover" /> : profile.username.slice(0,1)}</div>
        <div className="min-w-0 flex-1"><h1 className="[overflow-wrap:anywhere] text-3xl font-black">{profile.username}</h1><p className="mt-2 text-sm text-black/55">{profile.projectCount} 份公开作品 · {profile.projectVotes} 个赞 · {profile.contribution_points} 清运值</p><p className="mt-2 text-xs text-black/40">加入于 {serverDate(profile.created_at).toLocaleDateString("zh-CN")}</p></div>
      </header>
      <div className="mb-6 flex gap-3"><button onClick={() => setBeads(false)} className={`border-2 border-black px-4 py-2 font-black ${!beads ? "bg-[var(--acid)]" : "bg-white"}`}>社区作品</button><button onClick={() => setBeads(true)} className={`border-2 border-black px-4 py-2 font-black ${beads ? "bg-[var(--acid)]" : "bg-white"}`}>拼豆图纸</button></div>
      {beads ? <BeadProfile /> : <>{projects.length ? <div className="grid gap-5 sm:grid-cols-2">{projects.map(project => <Link key={project.id} href={`/projects/${project.id}`} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000] hover:-translate-y-1"><span className="text-xs font-black text-[var(--orange)]">{categoryLabel(project.category)}</span><h2 className="mt-3 [overflow-wrap:anywhere] text-xl font-black">{project.title}</h2><p className="mt-3 [overflow-wrap:anywhere] text-sm text-black/60">{project.summary}</p><p className="mt-5 text-xs font-bold">{project.votes_count} 赞 · {project.comments_count} 条评论</p></Link>)}</div> : <p className="border-2 border-dashed p-16 text-center">作者还没有公开的社区作品。</p>}{total > 12 && <Pagination page={page} totalPages={Math.ceil(total / 12)} onChange={setPage} />}</>}
    </>}
  </div></div>;
}
