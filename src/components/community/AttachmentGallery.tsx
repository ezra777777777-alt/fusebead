"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { ATTACHMENT_LIMIT, errorGallery, failureReason, isAttachmentApiPath, loadingGallery, moveId, readyGallery, sortAttachments, type GalleryItem } from "@/lib/attachment-gallery";

type Attachment = GalleryItem & { mime: string; byteSize: number };
type ListResponse = { attachments: Attachment[]; revision: number; status: string; limit: number };

export function AttachmentGallery({ projectId, initialRevision, canEdit, enabled, onUpdated }: {
  projectId: number;
  initialRevision: number;
  canEdit: boolean;
  enabled: boolean;
  onUpdated?: (patch: { revision: number; status: string }) => void;
}) {
  const [revision, setRevision] = useState(initialRevision);
  const [view, setView] = useState<{ phase: "loading" | "ready" | "error"; skeleton: boolean; canRetry: boolean; error: string }>(loadingGallery());
  const [items, setItems] = useState<Attachment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => { setRevision(initialRevision); }, [projectId, initialRevision]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setView(loadingGallery());
    api<ListResponse>(`/projects/${projectId}/attachments`)
      .then((data) => {
        if (!active) return;
        const ordered = sortAttachments(data.attachments);
        setItems(ordered);
        setRevision(data.revision);
        setSelectedId((current) => current && ordered.some((item) => item.id === current) ? current : ordered[0]?.id ?? null);
        setView(readyGallery(ordered));
      })
      .catch((error) => { if (active) setView(errorGallery(error, "图片列表加载失败，请重试")); });
    return () => { active = false; };
  }, [enabled, projectId, attempt]);

  const apply = (data: { revision: number; status: string }) => {
    setRevision(data.revision);
    onUpdated?.({ revision: data.revision, status: data.status });
  };

  const upload = async (files?: FileList | null) => {
    if (!files?.length || busy) return;
    setBusy(true);
    setActionError("");
    let nextRevision = revision;
    try {
      for (const file of Array.from(files)) {
        if (file.size > 2 * 1024 * 1024) throw new Error("单张图片不能超过 2 MB");
        const image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("无法读取图片"));
          reader.readAsDataURL(file);
        });
        const result = await api<{ revision: number; status: string }>(`/projects/${projectId}/attachments`, { method: "POST", body: JSON.stringify({ image, revision: nextRevision }) });
        nextRevision = result.revision;
        apply(result);
      }
      setAttempt((value) => value + 1);
    } catch (error) { setActionError(failureReason(error, "图片上传失败，请重试")); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (busy || !window.confirm("确认移除这张图片？移除后原来的链接会失效。")) return;
    setBusy(true);
    setActionError("");
    try {
      apply(await api(`/projects/${projectId}/attachments/${id}`, { method: "DELETE", body: JSON.stringify({ revision }) }));
      setAttempt((value) => value + 1);
    } catch (error) { setActionError(failureReason(error, "移除失败，请重试")); }
    finally { setBusy(false); }
  };

  const reorder = async (id: number, direction: -1 | 1) => {
    const ids = moveId(items.map((item) => item.id), id, direction);
    if (ids.join() === items.map((item) => item.id).join() || busy) return;
    setBusy(true);
    setActionError("");
    try {
      const result = await api<ListResponse>(`/projects/${projectId}/attachments/order`, { method: "PUT", body: JSON.stringify({ ids, revision }) });
      setItems(sortAttachments(result.attachments));
      apply(result);
    } catch (error) { setActionError(failureReason(error, "调整顺序失败，请重试")); }
    finally { setBusy(false); }
  };

  if (!enabled) return <p className="border-2 border-black bg-white p-4 text-sm font-bold">登录后查看图片</p>;
  if (view.phase === "loading") return <AttachmentSkeleton />;
  if (view.phase === "error") return <div role="alert" className="border-2 border-red-600 bg-red-50 p-4"><p className="text-sm font-bold text-red-700">{view.error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 border-2 border-black bg-white px-3 py-2 text-xs font-black">重新加载图片</button></div>;
  if (!items.length && !canEdit) return null;

  const selected = items.find((item) => item.id === selectedId) || items[0];
  return (
    <section aria-label="帖子图片" className="border-2 border-black bg-white p-4 shadow-[5px_5px_0_#000]">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">图片</h2><span className="text-xs font-black text-black/40">{items.length}/{ATTACHMENT_LIMIT}</span></div>
      {selected ? <LargeAttachment key={`${selected.id}:${attempt}`} src={selected.url} alt="大图" /> : <p className="mt-4 border border-dashed border-black/30 p-8 text-center text-sm font-bold text-black/40">还没有图片</p>}
      {items.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{items.map((item, index) => (
        <div key={item.id} className="w-24 shrink-0">
          <Thumb src={item.thumbnailUrl} alt={`缩略图 ${index + 1}`} selected={selected?.id === item.id} onSelect={() => setSelectedId(item.id)} />
          {canEdit && <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] font-black">
            <button type="button" disabled={busy || index === 0} onClick={() => reorder(item.id, -1)} className="border border-black disabled:opacity-30">前</button>
            <button type="button" disabled={busy || index === items.length - 1} onClick={() => reorder(item.id, 1)} className="border border-black disabled:opacity-30">后</button>
            <button type="button" disabled={busy} onClick={() => remove(item.id)} className="border border-black text-red-700">删</button>
          </div>}
        </div>
      ))}</div>}
      {canEdit && <div className="mt-4 border-2 border-dashed border-black/30 bg-[var(--paper)] p-3">
        <label className="block text-sm font-black">{busy ? "正在处理图片…" : "添加图片"}<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy || items.length >= ATTACHMENT_LIMIT} onChange={(event) => { void upload(event.target.files); event.target.value = ""; }} className="mt-2 block w-full text-xs" /></label>
        <p className="mt-2 text-xs font-semibold leading-5 text-black/50">按文件内容识别 PNG、JPEG、WebP，单张不超过 2 MB，最多 {ATTACHMENT_LIMIT} 张。会去掉位置等元数据。作者增删图片后帖子会重新送审，通过前其他人看不到。</p>
      </div>}
      {actionError && <p role="alert" className="mt-3 text-sm font-bold text-red-600">{actionError}</p>}
    </section>
  );
}

function AttachmentSkeleton() {
  return <div aria-busy="true" className="border-2 border-black bg-white p-4 shadow-[5px_5px_0_#000]"><p className="text-sm font-black">正在加载图片…</p><div className="attachment-skeleton mt-3 h-64 animate-pulse bg-black/10" /><div className="mt-3 flex gap-2">{[0, 1, 2].map((item) => <div key={item} className="attachment-skeleton h-16 w-24 animate-pulse bg-black/10" />)}</div></div>;
}

function LargeAttachment({ src, alt }: { src: string; alt: string }) {
  const image = useAuthedImage(src);
  if (image.phase === "loading") return <div aria-busy="true" className="attachment-skeleton mt-3 h-64 animate-pulse bg-black/10" />;
  if (image.phase === "error") return <div role="alert" className="mt-3 border border-red-600 bg-red-50 p-4"><p className="text-sm font-bold text-red-700">{image.error}</p><button type="button" onClick={image.retry} className="mt-3 border-2 border-black bg-white px-3 py-2 text-xs font-black">重试</button></div>;
  return <div className="mt-3 overflow-hidden border-2 border-black bg-black"><img src={image.url} alt={alt} className="max-h-[520px] w-full object-contain" /></div>;
}

function Thumb({ src, alt, selected, onSelect }: { src: string; alt: string; selected: boolean; onSelect: () => void }) {
  const image = useAuthedImage(src);
  if (image.phase === "error") return <div className="border-2 border-red-600 px-1 py-2 text-center text-[10px] font-bold leading-4 text-red-700">{image.error}<button type="button" onClick={image.retry} className="mt-1 block w-full underline">重试</button></div>;
  return <button type="button" onClick={onSelect} aria-pressed={selected} className={`block w-full border-2 ${selected ? "border-[var(--orange)]" : "border-black"}`}>{image.phase === "loading" ? <span aria-busy="true" className="attachment-skeleton block h-16 animate-pulse bg-black/10" /> : <img src={image.url} alt={alt} className="h-16 w-full object-cover" />}</button>;
}

function useAuthedImage(src: string) {
  const [reload, setReload] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAttachmentApiPath(src)) { setPhase("error"); setError("图片地址无效"); return; }
    let objectUrl = "";
    let cancelled = false;
    setPhase("loading");
    setError("");
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}${src}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "图片加载失败");
        }
        if (!(response.headers.get("content-type") || "").startsWith("image/")) throw new Error("图片内容无效");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) { setUrl(objectUrl); setPhase("ready"); }
      })
      .catch((reason) => { if (!cancelled) { setPhase("error"); setError(failureReason(reason)); } });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, reload]);
  return { phase, url, error, retry: () => setReload((value) => value + 1) };
}
