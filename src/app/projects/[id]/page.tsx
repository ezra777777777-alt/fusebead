"use client";

import { categoryLabel, serverDate } from "@/lib/community";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Code2, ExternalLink, Eye, Flag, Loader2, MessageCircle, Send, ShieldCheck, ThumbsUp, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

import { GITHUB_CATEGORY, Project, projectStatus } from "@/lib/community";

type Comment = { id: number; user_id: number; content: string; username: string; contribution_points: number; created_at: string };

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const searchParams = useSearchParams();
  const feed = new URLSearchParams(searchParams.get("feed") || "");
  const { user, loading: authLoading, openAuth } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const github = project?.category === GITHUB_CATEGORY;
  const returnToGithub = searchParams.get("from") === "github" || (github && !searchParams.has("feed"));
  const backHref = `${returnToGithub ? "/github" : "/"}${feed.size ? `?${feed}` : ""}#${returnToGithub ? "projects" : "feed"}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentNotice, setCommentNotice] = useState("");
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("危险链接");
  const [busy, setBusy] = useState(false);
  const [reportDetail, setReportDetail] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [projectData, commentData] = await Promise.all([
        api<Project>(`/projects/${projectId}`),
        api<Comment[]>(`/projects/${projectId}/comments`),
      ]);
      setProject(projectData);
      setComments(commentData);
    } catch (err: any) { setProject(null); setError(err?.message || "污染物档案不存在"); }
    finally { setLoading(false); }
  }, [projectId, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (Number.isSafeInteger(projectId) && projectId > 0) load();
    else { setLoading(false); setError("作品编号无效"); }
  }, [load, projectId, authLoading]);

  const vote = async () => {
    if (!user) { openAuth(); return; }
    if (!project) return;
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ voted: boolean; votes_count: number }>(`/projects/${project.id}/vote`, { method: "POST", body: JSON.stringify({ voted: !project.has_voted }) });
      setProject({ ...project, has_voted: result.voted, votes_count: result.votes_count });
    } catch (e) { setError(e instanceof Error ? e.message : "点赞失败，请重试"); }
    finally { setBusy(false); }
  };

  const postComment = async () => {
    if (!user) { openAuth(); return; }
    if (!comment.trim() || !project || posting) return;
    setPosting(true); setCommentError(""); setCommentNotice("");
    try {
      await api(`/projects/${project.id}/comments`, { method: "POST", body: JSON.stringify({ content: comment }) });
      setComment("");
      await load();
      setCommentNotice("评论已发表");
    } catch (e) { setCommentError(e instanceof Error ? e.message : "评论失败，请重试"); } finally { setPosting(false); }
  };

  const deleteComment = async (commentId: number) => {
    if (!project) return;
    if (busy || !window.confirm("确认删除自己的这条评论？")) return;
    setBusy(true); setCommentError(""); setCommentNotice("");
    try { await api(`/projects/${project.id}/comments/${commentId}`, { method: "DELETE" }); await load(); setCommentNotice("评论已删除"); }
    catch (e) { setCommentError(e instanceof Error ? e.message : "删除失败"); }
    finally { setBusy(false); }
  };

  const report = async () => {
    if (!user) { openAuth(); return; }
    if (!project) return;
    if (busy) return;
    setBusy(true); setReportError(""); setReportSent(false);
    try {
      await api(`/projects/${project.id}/report`, { method: "POST", body: JSON.stringify({ reason: reportReason, detail: reportDetail }) });
      setReportSent(true); setReportOpen(false);
    } catch (e) { setReportError(e instanceof Error ? e.message : "举报失败"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)] pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!project) return <div className="min-h-screen bg-[var(--background)] px-4 pt-32 text-center"><h1 className="text-3xl font-black">暂时无法打开这份作品</h1><p role="alert" className="mt-2 font-bold text-black/45">{error}</p><div className="mt-6 flex flex-wrap justify-center gap-5">{Number.isSafeInteger(projectId) && projectId > 0 && <button onClick={() => { setLoading(true); void load(); }} className="font-black underline">重新加载作品</button>}<Link href={backHref} className="font-black underline">回污染物列表</Link><Link href="/dashboard" className="font-black underline">查看我的投稿</Link></div></div>;

  const level = Math.max(1, Math.floor(Number(project.author_points || 0) / 50) + 1);

  return (
    <div className="min-h-screen bg-[var(--background)] pt-16 text-black">
      <div className="border-b-4 border-black bg-[#111] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-black text-white/45 hover:text-[var(--acid)]"><ArrowLeft className="h-4 w-4" />{returnToGithub ? "返回资源分享" : "返回污染区"}</Link>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="bg-[var(--acid)] px-2 py-1 text-black">CN-404-{String(project.id).padStart(6, "0")}</span>
            <span className="border border-white/30 px-2 py-1 text-white/65">{categoryLabel(project.category)}</span>
            {project.is_featured ? <span className="bg-[var(--orange)] px-2 py-1">重点污染物</span> : null}
            {project.status !== "approved" || project.is_deleted ? <span className="bg-yellow-300 px-2 py-1 text-black">{project.is_deleted ? "已下架" : projectStatus[project.status]}</span> : null}
          </div>
          <h1 className="mt-4 max-w-4xl [overflow-wrap:anywhere] text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">{project.title}</h1>
          <p className="mt-4 max-w-3xl [overflow-wrap:anywhere] text-base font-semibold leading-7 text-white/60">{project.summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-bold text-white/45">
            <span>搬运工：<Link href={`/user/${project.user_id}`} className="[overflow-wrap:anywhere] text-white underline">{project.author_name}</Link></span>
            <span className="border border-white/20 px-1.5 py-0.5">L{level}</span>
            <span>{serverDate(project.created_at).toLocaleString("zh-CN")}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:px-8">
        <main className="min-w-0 space-y-6">
          {error && <div role="alert" className="border-2 border-red-600 bg-red-50 p-4 text-red-700">{error}</div>}
          {(user?.id === project.user_id || user?.is_admin) && <div className="border-2 border-black bg-yellow-50 p-4 text-sm"><strong>{project.is_deleted ? "已下架" : projectStatus[project.status]} · 第 {project.revision} 版</strong>{project.moderation_note && <p className="mt-2">审核说明：{project.moderation_note}</p>}<div className="mt-3 flex gap-5"><Link href="/dashboard" className="underline">返回个人中心</Link>{user?.id === project.user_id && !project.is_deleted && <Link href={`/submit?edit=${project.id}`} className="font-black underline">修改并重新送审</Link>}</div></div>}
          {project.cover_url && <div className="overflow-hidden border-2 border-black bg-black shadow-[6px_6px_0_#000]"><img src={project.cover_url} alt={`${project.title} 截图`} className="max-h-[520px] w-full object-contain" /></div>}

          <section className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#000] sm:p-7">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--orange)]">{github ? "PROJECT NOTES" : "INCIDENT REPORT"}</div>
            <h2 className="mt-1 text-2xl font-black">{github ? "推荐理由与使用方法" : "作案供述"}</h2>
            <p className="mt-5 [overflow-wrap:anywhere] whitespace-pre-wrap text-sm font-semibold leading-7 text-black/65">{project.confession || (github ? "分享者还没有补充使用体验，欢迎在评论里交流。" : "作者什么都没交代，态度十分嚣张。")}</p>
            {project.tech_stack && <div className="mt-6 border-l-4 border-[var(--acid)] bg-[var(--paper)] p-4"><div className="text-xs font-black text-black/35">{github ? "技术栈与用途" : "作案工具"}</div><div className="mt-1 [overflow-wrap:anywhere] text-sm font-black">{project.tech_stack}</div></div>}
          </section>

          <section className="border-2 border-black bg-white shadow-[5px_5px_0_#000]">
            <div className="flex items-center justify-between border-b-2 border-black bg-[var(--paper)] px-5 py-3"><h2 className="flex items-center gap-2 text-lg font-black"><MessageCircle className="h-5 w-5" />围观记录</h2><span className="text-xs font-black text-black/40">{comments.length} 条</span></div>
            <div className="p-5">
              <div className="flex gap-2">
                <input aria-label="评论内容" disabled={project.status !== "approved" || !!project.is_deleted} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && postComment()} maxLength={1000} placeholder="来都来了，锐评两句……" className="cyber-input min-w-0 flex-1" />
                <button aria-label="发表评论" onClick={postComment} disabled={posting || !comment.trim() || project.status !== "approved" || !!project.is_deleted} className="shrink-0 border-2 border-black bg-[var(--orange)] px-4 text-white disabled:opacity-40">{posting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
              </div>
              {commentError && <p role="alert" className="mt-3 text-sm font-bold text-red-600">{commentError}</p>}
              {commentNotice && <p role="status" className="mt-3 text-sm font-bold text-green-700">{commentNotice}</p>}
              <div className="mt-5 divide-y divide-black/10">
                {comments.length ? comments.map((item) => (
                  <div key={item.id} className="flex gap-3 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-black text-sm font-black text-[var(--acid)]">{item.username?.slice(0, 1) || "匿"}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-xs"><strong className="min-w-0 [overflow-wrap:anywhere]">{item.username}</strong><span className="shrink-0 border border-black/20 bg-[var(--paper)] px-1">清运值 {item.contribution_points}</span><span className="text-black/30">{serverDate(item.created_at).toLocaleString("zh-CN")}</span>{user?.id === item.user_id && <button aria-label="删除评论" disabled={busy} onClick={() => deleteComment(item.id)} className="ml-auto shrink-0 p-2 text-black/25 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}</div><p className="mt-1 [overflow-wrap:anywhere] text-sm font-medium leading-6 text-black/65">{item.content}</p></div>
                  </div>
                )) : <p className="py-10 text-center text-sm font-bold text-black/30">还没人受害，抢个一楼。</p>}
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="border-2 border-black bg-white p-4 shadow-[5px_5px_0_#000]">
            <div className="grid grid-cols-3 divide-x divide-black/15 text-center">
              <div><div className="text-xl font-black">{project.votes_count}</div><div className="text-[10px] font-bold text-black/35">{github ? "觉得有用" : "好屎"}</div></div>
              <div><div className="text-xl font-black">{project.comments_count}</div><div className="text-[10px] font-bold text-black/35">锐评</div></div>
              <div><div className="text-xl font-black">{project.views_count}</div><div className="text-[10px] font-bold text-black/35">围观</div></div>
            </div>
            <button disabled={busy || project.status !== "approved" || !!project.is_deleted} onClick={vote} className={`mt-4 flex w-full items-center justify-center gap-2 border-2 border-black py-3 text-sm font-black shadow-[3px_3px_0_#000] ${project.has_voted ? "bg-[var(--acid)]" : "bg-white"}`}><ThumbsUp className="h-4 w-4" />{github ? (project.has_voted ? "已赞 · 再点取消" : "这个项目有用") : (project.has_voted ? "好吃，爱吃" : "鉴定为好屎")}</button>
          </section>

          <section className="border-2 border-black bg-[#fff7d6] p-4 shadow-[5px_5px_0_#000]">
            <h2 className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4" />外链安全提示</h2>
            <p className="mt-2 text-xs font-bold leading-5 text-black/50">{github ? "项目由社区用户推荐，原作者和许可证以仓库为准。安装或运行前请阅读说明并核对权限；审核不代表代码安全保证。" : "试玩地址由投稿者提供，外部网站的内容可能随时变化；不要输入密码、验证码或支付信息。"}</p>
            {github && project.repo_url && <p className="mt-3 [overflow-wrap:anywhere] text-xs font-bold">原仓库：{project.repo_url.replace("https://github.com/", "")}</p>}
            <a href={github ? project.repo_url : project.demo_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 flex items-center justify-center gap-2 border-2 border-black bg-[var(--orange)] py-3 text-sm font-black text-white shadow-[3px_3px_0_#000]"><ExternalLink className="h-4 w-4" />{github ? "打开 GitHub 仓库" : "打开案发现场"}</a>
            {github ? project.demo_url !== project.repo_url && <a href={project.demo_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 block border-2 border-black bg-white py-2.5 text-center text-sm font-black">查看演示 / 官网</a> : project.repo_url && <a href={project.repo_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 flex items-center justify-center gap-2 border-2 border-black bg-white py-2.5 text-sm font-black"><Code2 className="h-4 w-4" />查看屎山源码</a>}
          </section>

          <section className="border-2 border-black bg-white p-4">
            <button disabled={project.status !== "approved" || !!project.is_deleted} onClick={() => setReportOpen((value) => !value)} className="flex w-full items-center gap-2 text-sm font-black text-red-600"><Flag className="h-4 w-4" />呼叫环卫</button>
            {reportSent && <p className="mt-3 text-xs font-bold text-green-600">举报已提交，可在个人中心查看处理结果。</p>}
            {reportError && <p role="alert" className="mt-3 text-sm font-bold text-red-600">{reportError}</p>}
            {reportOpen && <div className="mt-3 space-y-2"><select aria-label="举报原因" value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="cyber-input"><option>危险链接</option><option>盗版侵权</option><option>恶意软件</option><option>违法内容</option><option>冒充原创</option><option>其他</option></select><textarea aria-label="举报说明" value={reportDetail} onChange={e => setReportDetail(e.target.value)} maxLength={1000} rows={3} placeholder="补充具体问题，便于核实（选填）" className="cyber-input" /><button disabled={busy} onClick={report} className="w-full border-2 border-black bg-red-600 py-2 text-xs font-black text-white">提交举报</button></div>}
          </section>
        </aside>
      </div>
    </div>
  );
}
