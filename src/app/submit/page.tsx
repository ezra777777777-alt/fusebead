"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Project } from "@/lib/community";
import { ArrowLeft, CheckCircle2, Code2, ExternalLink, ImagePlus, Loader2, Save, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { api, API_BASE } from "@/lib/api";

const categories = ["能跑就行", "AI 套壳", "网页小玩具", "手机端", "游戏乱炖", "纯抽象", "教程与求助"];

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

export default function SubmitPage() { return <Suspense fallback={<p className="px-5 py-32 text-center">正在读取投稿…</p>}><SubmitEntry /></Suspense>; }
function SubmitEntry() {
  const editId = useSearchParams().get("edit");
  const { user } = useAuth();
  return <SubmitForm key={`${user?.id || "guest"}:${editId || "new"}`} editId={editId} />;
}
function SubmitForm({ editId }: { editId: string | null }) {
  const router = useRouter();
  const successRef = useRef<HTMLDivElement>(null);
  const [original, setOriginal] = useState<Project | null>(null);
  const [reading, setReading] = useState(!!editId);
  const { user, loading, openAuth } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const draftRef = useRef<Draft>(emptyDraft);
  const [draftNotice, setDraftNotice] = useState("");
  const [safe, setSafe] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (submittedId) {
      successRef.current?.scrollIntoView({ block: "center" });
      successRef.current?.focus({ preventScroll: true });
    }
  }, [submittedId]);

  const draftKey = `cyber-haul-draft:${user?.id || "guest"}:${editId || "new"}`;
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
      if (!user) { setReading(false); return; }
      api<Project>(`/projects/${editId}`).then(project => {
        if (!active) return;
        if (project.user_id !== user.id || project.is_deleted) throw new Error("这份投稿不能修改");
        setOriginal(project);
        restoreDraft({ title: project.title, summary: project.summary, category: project.category, demoUrl: project.demo_url, repoUrl: project.repo_url || "", coverUrl: project.cover_url || "", stack: project.tech_stack || "", confession: project.confession || "" });
        try {
          const stored = readDraft(draftKey);
          if (stored?.revision === project.revision) { restoreDraft({ ...emptyDraft, ...stored }); setSaved(true); setDraftNotice("已恢复这份投稿的本机草稿，修改尚未送审。"); }
          else if (stored) setDraftNotice("审核版本已更新，当前显示最新投稿；旧草稿未覆盖新版本。");
        } catch { setDraftNotice("无法读取本机草稿，当前显示服务器保存的投稿。"); }
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setReading(false); });
    } else {
      try {
        const own = readDraft(draftKey);
        const guestKey = "cyber-haul-draft:guest:new";
        const stored = own || readDraft(guestKey);
        if (stored) {
          restoreDraft({ ...emptyDraft, ...stored }); setSaved(true); setDraftNotice("已恢复本机草稿，尚未提交审核。");
          if (user && !own) { localStorage.setItem(draftKey, JSON.stringify(stored)); localStorage.removeItem(guestKey); }
        } else restoreDraft(emptyDraft);
      } catch { setDraftNotice("无法读取本机草稿，请保留自己的内容备份。"); }
    }
    return () => { active = false; };
  }, [editId, user?.id, loading, draftKey]);

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
      if (!editId) restoreDraft(emptyDraft);
      setDraftNotice("");
    } catch (err: any) {
      setError(err?.message || "投稿失败，环卫车半路抛锚了");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || reading) return <p className="px-5 py-32 text-center">正在读取投稿…</p>;
  if (editId && !user) return <div className="px-5 py-32 text-center"><h1 className="mb-5 text-2xl font-black">登录后修改投稿</h1><button onClick={openAuth} className="cyber-button bg-[var(--acid)]">登录</button></div>;
  if (editId && !original && error) return <div className="mx-auto max-w-xl px-5 py-32 text-center"><h1 className="text-2xl font-black">暂时无法打开这份投稿</h1><p role="alert" className="my-5">{error}</p><div className="flex flex-wrap justify-center gap-5"><button onClick={() => window.location.reload()} className="underline">重新加载</button><Link href="/dashboard" className="underline">返回我的投稿</Link><Link href="/submit" className="underline">新建投稿</Link></div></div>;
  return (
    <div className="min-h-screen bg-[var(--background)] pt-16 text-black">
      <div className="border-b-4 border-black bg-[#111]">
        <div className="mx-auto max-w-5xl px-4 py-10 text-white sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-white/50 hover:text-[var(--acid)]"><ArrowLeft className="h-4 w-4" /> 返回案发现场</Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--acid)]">SUBMIT YOUR SHITWARE</div>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-6xl">{editId ? "改好了，再端上来。" : "自己拉的，自己端。"}</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55">交代案发现场、作案工具和精神状态。不用吹，能打开就已经超过本站不少项目。</p>
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
              <p className="mt-2 text-sm font-bold text-black/60">污染编号 CN-404-{String(submittedId).padStart(6, "0")}，管理员放行后会出现在首页。</p>
              <Link href="/dashboard" className="mt-3 inline-flex text-xs font-black underline">进入个人中心查看进度</Link>
              <button type="button" onClick={() => { if (editId) router.push("/submit"); else { setSubmittedId(null); setSafe(false); setSaved(false); setError(""); } }} className="ml-5 mt-3 text-xs font-black underline">继续新投稿</button>
            </div>
          )}
          {!submittedId && <div className="grid gap-5">
            <div className="border-l-4 border-[var(--acid)] bg-[var(--paper)] p-3 text-sm"><p role="status">{draftNotice || "填写时自动保存本机草稿，离开后可回到投稿页继续。"}</p><p className="mt-2 text-xs text-black/55">草稿仅保存在当前浏览器，清理网站数据后会消失。<Link href="/help#submit" className="ml-2 underline">查看投稿说明</Link></p></div>
            <Field label="这坨叫什么" required>
              <input value={draft.title} onChange={(e) => update("title", e.target.value)} required maxLength={80} placeholder="例如：老板键 Excel 生成器" className="cyber-input" />
            </Field>

            <Field label="它到底祸害谁" required hint="一句话说明，别写融资计划书。">
              <textarea value={draft.summary} onChange={(e) => update("summary", e.target.value)} required maxLength={240} rows={3} placeholder="解决了什么不存在的问题？" className="cyber-input resize-none" />
            </Field>

            <fieldset><legend className="mb-2 text-sm font-black">送去哪个分拣区 <span className="text-[var(--orange)]">*</span></legend>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button key={category} type="button" aria-pressed={draft.category === category} onClick={() => update("category", category)} className={`border-2 border-black px-3 py-2 text-xs font-black ${draft.category === category ? "bg-black text-[var(--acid)]" : "bg-[var(--paper)] text-black"}`}>{category}</button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="案发现场" required icon={<ExternalLink className="h-4 w-4" />}>
                <input type="url" value={draft.demoUrl} onChange={(e) => update("demoUrl", e.target.value)} required placeholder="https://..." className="cyber-input" />
              </Field>
              <Field label="屎山源头" icon={<Code2 className="h-4 w-4" />}>
                <input type="url" value={draft.repoUrl} onChange={(e) => update("repoUrl", e.target.value)} placeholder="GitHub / Gitee，可不填" className="cyber-input" />
              </Field>
            </div>

            <Field label="用了哪些高科技制造垃圾" hint="技术栈、模型、编辑器都可以写。">
              <input value={draft.stack} onChange={(e) => update("stack", e.target.value)} maxLength={120} placeholder="Next.js、Cursor、Claude、三个通宵……" className="cyber-input" />
            </Field>

            <Field label="作案供述" hint="说说它为什么诞生、最离谱的 Bug，以及你是否后悔。">
              <textarea value={draft.confession} onChange={(e) => update("confession", e.target.value)} maxLength={1500} rows={7} placeholder="本来只想做个按钮，后来不知道为什么接上了区块链……" className="cyber-input resize-y" />
            </Field>

            <Field label="犯罪现场照片" icon={<ImagePlus className="h-4 w-4" />} hint="可填写公开图片链接。">
              <input type="url" value={draft.coverUrl} onChange={(e) => update("coverUrl", e.target.value)} placeholder="https://...（选填）" className="cyber-input" />
            </Field>

            <div className="border-2 border-dashed border-black/40 bg-[var(--paper)] p-5">
              {user ? <label className="block text-sm font-black">{uploading ? "正在处理截图…" : "也可以直接上传截图"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e => { void uploadCover(e.target.files?.[0]); e.target.value = ""; }} className="mt-3 block w-full text-xs" /></label> : <button type="button" onClick={() => { saveDraft(); openAuth(); }} className="font-black underline">登录后上传截图</button>}
              <p className="mt-3 text-xs font-semibold leading-5 text-black/50">PNG / JPEG / WebP，最大 2 MB、1200 万像素。上传后会压缩并移除图片元数据。图片链接可直接访问，请勿包含私人信息。</p>
              {draft.coverUrl && <img src={draft.coverUrl} alt="投稿截图预览" className="mt-4 max-h-64 w-full object-contain" />}
            </div>

            <label className="flex cursor-pointer items-start gap-3 border-2 border-black bg-[#fff7d6] p-4">
              <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="mt-1 h-4 w-4 accent-black" />
              <span className="text-xs font-bold leading-5 text-black/65">我保证这不是木马、钓鱼、盗版或偷数据的真垃圾；项目和截图有权公开展示。我已阅读并同意 <Link href="/rules" target="_blank" className="underline">社区规则</Link>。玩梗可以，害人不行。</span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => saveDraft()} className="cyber-button flex-1 bg-white text-black"><Save className="h-5 w-5" />{saved ? "已经存本机了" : "先存草稿"}</button>
              <button type="submit" disabled={submitting || uploading || !!submittedId || (Boolean(editId) && !original) || !safe || !draft.title || !draft.summary || !draft.demoUrl} className="cyber-button flex-[1.4] bg-[var(--orange)] text-white disabled:cursor-not-allowed disabled:opacity-35">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}{user ? (submitting ? "清运中..." : (editId ? "修改并重新送审" : "送去环卫质检")) : "登录后端上去"}</button>
            </div>
            {error && <p className="border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
          </div>}
        </form>

        <aside className="space-y-5">
          <section className="border-2 border-black bg-[var(--acid)] p-4 shadow-[5px_5px_0_#000]">
            <h2 className="flex items-center gap-2 text-sm font-black"><CheckCircle2 className="h-4 w-4" /> 什么值得清运</h2>
            <ul className="mt-3 space-y-2 text-xs font-bold leading-5 text-black/65">
              <li>· 能直接打开试玩的网页项目</li>
              <li>· 一眼就能看懂的奇怪用途</li>
              <li>· 作者愿意交代作案过程</li>
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
