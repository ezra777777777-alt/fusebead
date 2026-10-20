"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { categories, categoryLabel, GITHUB_CATEGORY, Project } from "@/lib/community";
import { runRequest } from "@/lib/load-state";
import { LoadFailure, LoadingSkeleton } from "@/components/shared/LoadState";
import { ArrowLeft, CheckCircle2, Code2, ExternalLink, ImagePlus, Loader2, Save, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api, API_BASE } from "@/lib/api";
import { AuthedCover } from "@/components/community/AuthedCover";

type Draft = {
  title: string;
  summary: string;
  category: string;
  demoUrl: string;
  repoUrl: string;
  coverUrl: string;
  stack: string;
  confession: string;
};

const emptyDraft: Draft = {
  title: "",
  summary: "",
  category: "能跑就行",
  demoUrl: "",
  repoUrl: "",
  coverUrl: "",
  stack: "",
  confession: "",
};

export default function SubmitPage() { return <Suspense fallback={<div className="min-h-screen bg-[var(--background)] px-4 pb-16 pt-24"><LoadingSkeleton label="正在读取投稿…" variant="form" /></div>}><SubmitEntry /></Suspense>; }
function SubmitEntry() {
  const params = useSearchParams();
  const editId = params.get("edit");
  const initialCategory = params.get("category") === GITHUB_CATEGORY ? GITHUB_CATEGORY : emptyDraft.category;
  const { user } = useAuth();
  return <SubmitForm key={`${user?.id || "guest"}:${editId || initialCategory}`} editId={editId} initialCategory={initialCategory} />;
}
function SubmitForm({ editId, initialCategory }: { editId: string | null; initialCategory: string }) {
  const router = useRouter();
  const successRef = useRef<HTMLDivElement>(null);
  const [original, setOriginal] = useState<Project | null>(null);
  const [reading, setReading] = useState(!!editId);
  const { user, loading, openAuth } = useAuth();
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft, category: initialCategory });
  const draftRef = useRef<Draft>(draft);
  const github = draft.category === GITHUB_CATEGORY;
  const newSubmitHref = github ? `/submit?category=${encodeURIComponent(GITHUB_CATEGORY)}` : "/submit";
  const [draftNotice, setDraftNotice] = useState("");
  const [safe, setSafe] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [authDenied, setAuthDenied] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (submittedId) {
      successRef.current?.scrollIntoView({ block: "center" });
      successRef.current?.focus({ preventScroll: true });
    }
  }, [submittedId]);

  const draftScope = editId || (initialCategory === GITHUB_CATEGORY ? "github" : "new");
  const draftKey = `cyber-haul-draft:${user?.id || "guest"}:${draftScope}`;
  const restoreDraft = (value: Draft) => { draftRef.current = value; setDraft(value); };
  const readDraft = (key: string) => {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (!stored || typeof stored !== "object") return null;
    for (const field of Object.keys(emptyDraft) as (keyof Draft)[]) {
      if (stored[field] !== undefined && typeof stored[field] !== "string") return null;
    }
    return stored as Draft & { revision?: number };
  };
  useEffect(() => {
    if (loading) return;
    let active = true;
    if (editId) {
      setReading(true);
      setError("");
      setAuthDenied(false);
      if (!user) { setReading(false); setOriginal(null); return; }
      const editor = user;
      void runRequest(async () => {
        const project = await api<Project>(`/projects/${editId}`);
        if (project.user_id !== editor.id || project.is_deleted) throw new Error("这份投稿不能修改");
        return project;
      }, "暂时无法打开这份投稿").then(result => {
        if (!active) return;
        if (result.phase === "unauthorized") {
          setAuthDenied(true);
          setOriginal(null);
          setError("");
          restoreDraft({ ...emptyDraft, category: initialCategory });
          return;
        }
        if (result.phase !== "ready" || !result.data) { setAuthDenied(false); setError(result.error || "暂时无法打开这份投稿"); return; }
        const project = result.data;
        setAuthDenied(false);
        setOriginal(project);
        restoreDraft({ title: project.title, summary: project.summary, category: project.category, demoUrl: project.demo_url, repoUrl: project.repo_url || "", coverUrl: project.cover_url || "", stack: project.tech_stack || "", confession: project.confession || "" });
        try {
          const stored = readDraft(draftKey);
          if (stored?.revision === project.revision) { restoreDraft({ ...emptyDraft, ...stored }); setSaved(true); setDraftNotice("已恢复这份投稿的本机草稿，修改尚未送审。"); }
          else if (stored) setDraftNotice("审核版本已更新，当前显示最新投稿；旧草稿未覆盖新版本。");
        } catch { setDraftNotice("无法读取本机草稿，当前显示服务器保存的投稿。"); }
      }).finally(() => { if (active) setReading(false); });
    } else {
      try {
        const own = readDraft(draftKey);
        const guestKey = `cyber-haul-draft:guest:${draftScope}`;
        const stored = own || readDraft(guestKey);
        if (stored) {
          restoreDraft({ ...emptyDraft, ...stored }); setSaved(true); setDraftNotice("已恢复本机草稿，尚未提交审核。");
          if (user && !own) { localStorage.setItem(draftKey, JSON.stringify(stored)); localStorage.removeItem(guestKey); }
        } else restoreDraft({ ...emptyDraft, category: initialCategory });
      } catch { setDraftNotice("无法读取本机草稿，请保留自己的内容备份。"); }
    }
    return () => { active = false; };
  }, [editId, user?.id, loading, draftKey, draftScope, initialCategory, loadAttempt]);

  const update = (key: keyof Draft, value: string) => {
    const next = { ...draftRef.current, [key]: value };
    restoreDraft(next);
    saveDraft(next);
  };

  const saveDraft = (value = draftRef.current) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...value, revision: original?.revision }));
      setSaved(true);
      setDraftNotice("草稿已自动保存在当前浏览器，尚未送审。");
    } catch { setSaved(false); setDraftNotice("浏览器无法保存草稿，请保留本页或复制内容备份。"); }
  };

  const uploadCover = async (file?: File) => {
    if (!file) return;
    if (!user) { openAuth(); return; }
    if (file.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("请选择不超过 2 MB 的 PNG、JPEG 或 WebP 图片"); return; }
    setUploading(true); setError("");
    try {
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("无法读取图片")); reader.readAsDataURL(file); });
      const result = await api<{ path: string }>("/projects/cover", { method: "POST", body: JSON.stringify({ image }) });
      update("coverUrl", `${API_BASE}${result.path}`);
    } catch (e) { setError(e instanceof Error ? e.message : "截图上传失败"); }
    finally { setUploading(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) { saveDraft(); openAuth(); return; }
    if (submitting || !safe) return;
    if (editId && !original) { setError("请重新打开要修改的投稿"); return; }
    setSubmitting(true);
    setError("");
    try {
      const result = await api<{ id: number }>(`/projects${editId ? `/${editId}` : ""}`, {
        method: editId ? "PUT" : "POST",
        body: JSON.stringify({
          acceptedRules: safe,
          revision: original?.revision,
          title: draft.title,
          summary: draft.summary,
          category: draft.category,
          demoUrl: draft.demoUrl,
          repoUrl: draft.repoUrl,
          coverUrl: draft.coverUrl,
          techStack: draft.stack,
          confession: draft.confession,
        }),
      });
      setSubmittedId(result.id);
      try { localStorage.removeItem(draftKey); } catch { /* Submission succeeded even if browser storage is unavailable. */ }
      if (!editId) restoreDraft({ ...emptyDraft, category: draft.category });
      setDraftNotice("");
    } catch (err: any) {
      setError(err?.message || "投稿失败，环卫车半路抛锚了");
    } finally {
      setSubmitting(false);
    }
  };

  const retryEditLoad = () => { setError(""); setAuthDenied(false); setReading(true); setLoadAttempt(value => value + 1); };
  if (loading || reading) return <div className="min-h-screen bg-[var(--background)] px-4 pb-16 pt-24"><LoadingSkeleton label="正在读取投稿…" variant="form" /></div>;
  if (editId && (!user || authDenied)) return <div data-phase="login" className="px-5 py-32 text-center"><h1 className="mb-5 text-2xl font-black">登录后修改投稿</h1><p className="mb-5 text-sm font-semibold text-black/70">未登录时不读取投稿标题、正文或截图。</p><button onClick={() => openAuth()} className="cyber-button bg-[var(--acid)]">登录</button></div>;
  if (editId && !original && error) return <div className="mx-auto max-w-xl px-5 py-24 text-center"><LoadFailure message={error} onRetry={retryEditLoad} /><div className="mt-5 flex flex-wrap justify-center gap-5"><Link href="/dashboard" className="underline">返回我的投稿</Link><Link href="/submit" className="underline">新建投稿</Link></div></div>;
  return (
    <div className="min-h-screen bg-[var(--background)] pt-16 text-black">
      <div className="border-b-4 border-black bg-[#111]">
        <div className="mx-auto max-w-5xl px-4 py-10 text-white sm:px-6 lg:px-8">
          <Link href={github ? "/github" : "/"} className="inline-flex items-center gap-2 text-sm font-black text-white/50 hover:text-[var(--acid)]"><ArrowLeft className="h-4 w-4" /> {github ? "返回资源分享" : "返回案发现场"}</Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--acid)]">{github ? "SHARE A RESOURCE" : "SUBMIT YOUR SHITWARE"}</div>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-6xl">{github ? (editId ? "补充体验，再分享。" : "好项目，别私藏。") : editId ? "改好了，再端上来。" : "自己拉的，自己端。"}</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55">{github ? "推荐公开的 GitHub 仓库，介绍用途和上手体验。可以分享他人的项目，请保留原作者出处。" : "交代案发现场、作案工具和精神状态。不用吹，能打开就已经超过本站不少项目。"}</p>
            </div>
            <div className="border-2 border-white bg-[var(--orange)] px-4 py-2 text-xs font-black shadow-[4px_4px_0_#fff]">投稿后先质检再公开</div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid grid-cols-1 max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
        <form onSubmit={submit} className="min-w-0 border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000] sm:p-7">
          {original && !submittedId && <div className="mb-6 border-2 border-black bg-yellow-50 p-4 text-sm"><strong>修改第 {original.revision} 版投稿</strong><p className="mt-2">{original.moderation_note || "修改提交后会重新审核，通过前不会公开。"}</p></div>}
          {submittedId && (
            <div ref={successRef} tabIndex={-1} role="status" className="mb-6 border-2 border-black bg-[var(--acid)] p-5 shadow-[4px_4px_0_#000]">
              <div className="flex items-center gap-2 text-lg font-black"><CheckCircle2 className="h-5 w-5" /> 已送进环卫站</div>
              <p className="mt-2 text-sm font-bold text-black/60">投稿编号 CN-404-{String(submittedId).padStart(6, "0")}，管理员放行后会出现在{github ? "资源分享专区" : "首页"}。</p>
              <Link href="/dashboard" className="mt-3 inline-flex text-xs font-black underline">进入个人中心查看进度</Link>
              <button type="button" onClick={() => { if (editId) router.push(newSubmitHref); else { setSubmittedId(null); setSafe(false); setSaved(false); setError(""); } }} className="ml-5 mt-3 text-xs font-black underline">继续新投稿</button>
            </div>
          )}
          {!submittedId && <div className="grid gap-5">
            <div className="border-l-4 border-[var(--acid)] bg-[var(--paper)] p-3 text-sm"><p role="status">{draftNotice || "填写时自动保存本机草稿，离开后可回到投稿页继续。"}</p><p className="mt-2 text-xs text-black/55">草稿仅保存在当前浏览器，清理网站数据后会消失。<Link href="/help#submit" className="ml-2 underline">查看投稿说明</Link></p></div>
            <Field label={github ? "项目名称" : "这坨叫什么"} required>
              <input value={draft.title} onChange={(e) => update("title", e.target.value)} required maxLength={80} placeholder={github ? "项目名 + 一句话亮点" : "例如：老板键 Excel 生成器"} className="cyber-input" />
            </Field>

            <Field label={github ? "它能帮你做什么" : "它到底祸害谁"} required hint={github ? "说明适合谁、解决什么问题。" : "一句话说明，别写融资计划书。"}>
              <textarea value={draft.summary} onChange={(e) => update("summary", e.target.value)} required maxLength={240} rows={3} placeholder={github ? "例如：把重复的表格整理工作自动化。" : "解决了什么不存在的问题？"} className="cyber-input resize-none" />
            </Field>

            <fieldset><legend className="mb-2 text-sm font-black">送去哪个分拣区 <span className="text-[var(--orange)]">*</span></legend>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button key={category} type="button" aria-pressed={draft.category === category} onClick={() => update("category", category)} className={`border-2 border-black px-3 py-2 text-xs font-black ${draft.category === category ? "bg-black text-[var(--acid)]" : "bg-[var(--paper)] text-black"}`}>{categoryLabel(category)}</button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={github ? "演示或官网" : "案发现场"} required={!github} hint={github ? "选填；没有在线演示也能分享。" : undefined} icon={<ExternalLink className="h-4 w-4" />}>
                <input type="url" value={draft.demoUrl} onChange={(e) => update("demoUrl", e.target.value)} required={!github} placeholder="https://..." className="cyber-input" />
              </Field>
              <Field label={github ? "GitHub 仓库地址" : "屎山源头"} required={github} hint={github ? "填写公开仓库主页，保留原作者出处。" : undefined} icon={<Code2 className="h-4 w-4" />}>
                <input type="url" value={draft.repoUrl} onChange={(e) => update("repoUrl", e.target.value)} required={github} placeholder={github ? "https://github.com/owner/repo" : "GitHub / Gitee，可不填"} className="cyber-input" />
              </Field>
            </div>

            <Field label={github ? "技术栈或用途标签" : "用了哪些高科技制造垃圾"} hint={github ? "方便大家按工具类型、语言或用途搜索。" : "技术栈、模型、编辑器都可以写。"}>
              <input value={draft.stack} onChange={(e) => update("stack", e.target.value)} maxLength={120} placeholder={github ? "Python、效率工具、数据整理……" : "Next.js、Cursor、Claude、三个通宵……"} className="cyber-input" />
            </Field>

            <Field label={github ? "推荐理由与使用方法" : "作案供述"} hint={github ? "写明原作者、上手步骤、适用场景，以及你遇到的限制。" : "说说它为什么诞生、最离谱的 Bug，以及你是否后悔。"}>
              <textarea value={draft.confession} onChange={(e) => update("confession", e.target.value)} maxLength={1500} rows={7} placeholder={github ? "为什么推荐？怎么开始用？需要什么环境？" : "本来只想做个按钮，后来不知道为什么接上了区块链……"} className="cyber-input resize-y" />
            </Field>

            <Field label={github ? "项目截图" : "犯罪现场照片"} icon={<ImagePlus className="h-4 w-4" />} hint="可填写公开图片链接。">
              <input type="url" value={draft.coverUrl} onChange={(e) => update("coverUrl", e.target.value)} placeholder="https://...（选填）" className="cyber-input" />
            </Field>

            <div className="border-2 border-dashed border-black/40 bg-[var(--paper)] p-5">
              {user ? <label className="block text-sm font-black">{uploading ? "正在处理截图…" : "也可以直接上传截图"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e => { void uploadCover(e.target.files?.[0]); e.target.value = ""; }} className="mt-3 block w-full text-xs" /></label> : <button type="button" onClick={() => { saveDraft(); openAuth(); }} className="font-black underline">登录后上传截图</button>}
              <p className="mt-3 text-xs font-semibold leading-5 text-black/50">PNG / JPEG / WebP，最大 2 MB、1200 万像素。上传后会压缩并移除图片元数据。图片链接可直接访问，请勿包含私人信息。</p>
              {draft.coverUrl && <AuthedCover src={draft.coverUrl} alt="投稿截图预览" className="mt-4 max-h-64 w-full object-contain" />}
            </div>

            <label className="flex cursor-pointer items-start gap-3 border-2 border-black bg-[#fff7d6] p-4">
              <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="mt-1 h-4 w-4 accent-black" />
              <span className="text-xs font-bold leading-5 text-black/65">我保证这不是木马、钓鱼、盗版或偷数据的真垃圾；项目和截图有权公开展示。我已阅读并同意 <Link href="/rules" target="_blank" className="underline">社区规则</Link>。玩梗可以，害人不行。</span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => saveDraft()} className="cyber-button flex-1 bg-white text-black"><Save className="h-5 w-5" />{saved ? "已经存本机了" : "先存草稿"}</button>
              <button type="submit" disabled={submitting || uploading || !!submittedId || (Boolean(editId) && !original) || !safe || !draft.title.trim() || !draft.summary.trim() || !(github ? draft.repoUrl.trim() : draft.demoUrl.trim())} className="cyber-button flex-[1.4] bg-[var(--orange)] text-white disabled:cursor-not-allowed disabled:opacity-35">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}{user ? (submitting ? "清运中..." : (editId ? "修改并重新送审" : "送去环卫质检")) : "登录后端上去"}</button>
            </div>
            {error && <p role="alert" className="border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
          </div>}
        </form>

        <aside className="space-y-5">
          <section className="border-2 border-black bg-[var(--acid)] p-4 shadow-[5px_5px_0_#000]">
            <h2 className="flex items-center gap-2 text-sm font-black"><CheckCircle2 className="h-4 w-4" /> 什么值得清运</h2>
            <ul className="mt-3 space-y-2 text-xs font-bold leading-5 text-black/65">
              <li>· {github ? "公开且能访问的 GitHub 仓库" : "能直接打开试玩的网页项目"}</li>
              <li>· {github ? "清晰的用途和真实使用体验" : "一眼就能看懂的奇怪用途"}</li>
              <li>· {github ? "推荐他人项目时注明原作者" : "作者愿意交代作案过程"}</li>
              <li>· 有截图、有源码更加分</li>
            </ul>
          </section>
          <section className="border-2 border-black bg-white p-4 shadow-[5px_5px_0_#000]">
            <h2 className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-[var(--orange)]" /> 环卫质检项目</h2>
            <ul className="mt-3 space-y-2 text-xs font-bold leading-5 text-black/55">
              <li>· 链接能不能打开</li>
              <li>· 有没有恶意跳转或收集隐私</li>
              <li>· 内容是否违法、侵权或骗人</li>
              <li>· 作者是不是拿别人的屎冒充自己的</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, hint, required, icon, children }: { label: string; hint?: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black">{icon}{label}{required && <span className="text-[var(--orange)]">*</span>}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] font-semibold text-black/40">{hint}</span>}
    </label>
  );
}
