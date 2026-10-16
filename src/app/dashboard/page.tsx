"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, MessageCircle, RefreshCw, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Project, projectStatus } from "@/lib/community";
import BeadDashboard from "@/components/dashboard/BeadDashboard";
import { MyFeedback } from "@/components/dashboard/MyFeedback";

type Report = { id: number; project_title: string; status: string; reason: string; resolution_note: string };
export default function DashboardPage() {
  const { user } = useAuth();
  return <Suspense fallback={<p className="px-5 py-32 text-center">正在打开个人中心…</p>}><Dashboard key={user?.id || "guest"} /></Suspense>;
}
function Dashboard() {
  const { user, loading, openAuth, refreshUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const params = useSearchParams();
  const requestedTab = params.get("tab") || "projects";
  const tab = ["projects", "reports", "feedback", "profile", "beads"].includes(requestedTab) ? requestedTab : "projects";
  const setTab = (value: string) => window.history.replaceState(null, "", `/dashboard?tab=${value}`);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notice, setNotice] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const userId = user?.id;
  const load = useCallback(async () => {
    if (!userId) return;
    setFetching(true); setError("");
    try {
      const [items, results] = await Promise.all([api<Project[]>("/projects/mine"), api<Report[]>("/projects/my-reports"), refreshUser()]);
      setProjects(items); setReports(results);
    } catch (e) { setError(e instanceof Error ? e.message : "加载失败，请重试"); }
    finally { setFetching(false); }
  }, [userId, refreshUser]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setUsername(user?.username || ""); setAvatar(user?.avatar_url || ""); }, [user]);

  const withdraw = async (item: Project) => {
    if (!window.confirm("撤回后作品将不再公开，可以修改后重新投稿。确认撤回？")) return;
    setBusy(true); setError("");
    try { await api(`/projects/${item.id}/withdraw`, { method: "POST", body: JSON.stringify({ revision: item.revision }) }); setNotice("作品已撤回，可以继续修改。"); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "撤回失败"); }
    finally { setBusy(false); }
  };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api("/user/me", { method: "PUT", body: JSON.stringify({ username, avatar_url: avatar }) });
      setNotice("资料已保存");
      try { await refreshUser(); } catch { setError("资料已保存，但账号信息暂时无法刷新，请稍后重新加载。"); }
    }
    catch (e) { setError(e instanceof Error ? e.message : "保存失败"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="px-6 py-32 text-center">正在读取账号…</div>;
  if (!user) return <div className="mx-auto min-h-[60vh] max-w-xl px-6 py-32 text-center"><h1 className="text-3xl font-black">你的环卫工作台</h1><p className="my-6">登录后查看投稿、审核结果和举报进度。</p><button onClick={openAuth} className="cyber-button bg-[var(--acid)]">登录 / 注册</button></div>;
  const visible = projects.filter(p => filter === "all" || (filter === "deleted" ? p.is_deleted : !p.is_deleted && p.status === filter));
  return <div className="min-h-screen pt-16 text-black">
    <div className="border-b-4 border-black bg-[#111] text-white"><div className="mx-auto max-w-6xl px-5 py-10">
      <p className="text-xs font-black tracking-[0.2em] text-[var(--acid)]">MY WORKSPACE · 个人中心</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div className="min-w-0"><h1 className="[overflow-wrap:anywhere] text-3xl sm:text-4xl font-black">{user.username}，开工了。</h1><p className="mt-3 text-sm text-white/60">投稿、质检进度和反馈，都在这里。</p></div><Link href="/submit" className="cyber-button bg-[var(--acid)] text-black"><Upload className="h-5 w-5" />新投稿</Link></div>
      <div className="mt-7 flex flex-wrap gap-6 text-sm font-bold"><span>{projects.length} 份投稿</span><span>{projects.filter(p => p.status === "pending" && !p.is_deleted).length} 份待审核</span><span>{user.contribution_points || 0} 清运值</span><Link className="underline" href={`/user/${user.id}`}>查看公开主页</Link>{user.is_admin && <Link href="/admin/projects" className="text-[var(--acid)] underline">进入审核后台</Link>}</div>
    </div></div>
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap gap-2">{[["projects","我的投稿"],["reports","举报结果"],["feedback","我的反馈"],["profile","个人资料"],["beads","拼豆工具与收藏"]].map(([key,label]) => <button key={key} onClick={() => { setTab(key); setNotice(""); setError(""); }} className={`border-2 border-black px-4 py-2 text-sm font-black ${tab === key ? "bg-black text-[var(--acid)]" : "bg-white"}`}>{label}</button>)}</div>
      {error && <p role="alert" className="mb-5 border-2 border-red-600 bg-red-50 p-4 text-red-700">{error} <button onClick={load} className="underline">重新加载</button></p>}
      {notice && <p role="status" className="mb-5 border-2 border-black bg-[var(--acid)] p-4 font-bold">{notice}</p>}
      {tab === "reports" && <button onClick={load} disabled={fetching} className="mb-5 flex items-center gap-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />{fetching ? "正在刷新…" : "刷新举报结果"}</button>}
      {tab === "projects" && <>
        <div className="mb-5 flex items-center justify-between gap-3"><label className="text-sm font-bold">投稿状态 <select value={filter} onChange={e => setFilter(e.target.value)} className="ml-2 border-2 border-black bg-white p-2"><option value="all">全部</option>{Object.entries(projectStatus).map(([key,label]) => <option key={key} value={key}>{label}</option>)}<option value="deleted">已下架</option></select></label><button onClick={load} disabled={fetching} className="flex items-center gap-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />刷新</button></div>
        {fetching ? <p className="py-12 text-center">正在读取投稿…</p> : visible.length ? <div className="space-y-4">{visible.map(item => <article key={item.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000]">
          <div className="flex flex-wrap items-center gap-3 text-xs font-black"><span className="bg-black px-2 py-1 text-[var(--acid)]">{item.is_deleted ? "已下架" : projectStatus[item.status]}</span><span>#{item.id} · {item.category} · 第 {item.revision} 版</span></div>
          <Link href={`/projects/${item.id}`} className="mt-3 block [overflow-wrap:anywhere] text-xl font-black hover:underline">{item.title}</Link><p className="mt-2 [overflow-wrap:anywhere] text-sm text-black/60">{item.summary}</p>
          {item.moderation_note && <div className="mt-4 border-l-4 border-[var(--orange)] bg-orange-50 p-3 text-sm"><strong>审核说明：</strong>{item.moderation_note}</div>}
          {item.status === "pending" && !item.is_deleted && <p className="mt-3 text-sm text-black/55">正在等待人工审核，通过后才会出现在社区。修改投稿会更新待审版本。</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-black/15 pt-4 text-sm font-bold"><Link href={`/projects/${item.id}`} className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{item.comments_count} 条评论 · 查看详情</Link>{!item.is_deleted && <Link href={`/submit?edit=${item.id}`} className="text-[var(--orange)] underline">{item.status === "rejected" || item.status === "withdrawn" ? "修改并重新投稿" : "编辑投稿"}</Link>}{!item.is_deleted && item.status !== "withdrawn" && <button disabled={busy} onClick={() => withdraw(item)} className="text-black/50 underline disabled:opacity-40">撤回</button>}</div>
        </article>)}</div> : <div className="border-2 border-dashed border-black/30 bg-white px-5 py-16 text-center"><ClipboardList className="mx-auto mb-3 h-10 w-10 text-black/30" /><p className="font-bold">{filter === "all" ? "这里还没有投稿" : "没有符合这个状态的投稿"}</p>{filter !== "all" && <button onClick={() => setFilter("all")} className="mt-4 mr-5 underline">查看全部投稿</button>}<Link href="/submit" className="mt-4 inline-block underline">{filter === "all" ? "提交你的第一个作品" : "新建投稿"} <ArrowUpRight className="inline h-4 w-4" /></Link></div>}
      </>}
      {tab === "reports" && <div className="space-y-4">{reports.length ? reports.map(report => <article key={report.id} className="border-2 border-black bg-white p-5"><div className="text-xs font-black text-[var(--orange)]">{report.status === "open" ? "处理中" : "已处理"}</div><h2 className="mt-2 text-lg font-black">{report.project_title}</h2><p className="mt-2 text-sm">举报原因：{report.reason}</p><p className="mt-3 border-t pt-3 text-sm">{report.resolution_note || "管理员核实后，处理结论会显示在这里。"}</p></article>) : <p className="border-2 border-dashed p-12 text-center">暂无举报记录。</p>}</div>}
      {tab === "profile" && <form onSubmit={saveProfile} className="max-w-xl space-y-5 border-2 border-black bg-white p-6"><label className="block font-bold">昵称<input required minLength={2} maxLength={40} value={username} onChange={e => setUsername(e.target.value)} className="cyber-input mt-2" /></label><label className="block font-bold">头像图片网址（选填）<input type="url" value={avatar} maxLength={1000} onChange={e => setAvatar(e.target.value)} className="cyber-input mt-2" /></label><button disabled={busy} className="cyber-button bg-[var(--acid)]">{busy ? "保存中…" : "保存资料"}</button><p className="text-sm text-black/55">昵称、头像和公开作品会展示给其他访客；邮箱不公开。</p></form>}
      {tab === "feedback" && <MyFeedback key={user.id} />}
      {tab === "beads" && <BeadDashboard />}
    </div>
  </div>;
}
