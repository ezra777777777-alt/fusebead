export const ATTACHMENT_LIMIT = 8;

export type GalleryItem = { id: number; sortOrder: number; url: string; thumbnailUrl: string };

export function failureReason(error: unknown, fallback = "图片加载失败，请重试") {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return fallback;
  return message.length > 160 ? `${message.slice(0, 160)}…` : message;
}

export function loadingGallery() {
  return { phase: "loading" as const, skeleton: true, canRetry: false, error: "" };
}

export function errorGallery(error: unknown, fallback?: string) {
  return { phase: "error" as const, skeleton: false, canRetry: true, error: failureReason(error, fallback) };
}

export function readyGallery<T>(items: T[]) {
  return { phase: "ready" as const, skeleton: false, canRetry: false, error: "", items };
}

export function sortAttachments<T extends { id: number; sortOrder: number }>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

export function moveId(ids: number[], id: number, direction: -1 | 1) {
  const next = [...ids];
  const index = next.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function isAttachmentApiPath(src: string) {
  return /^\/projects\/\d+\/attachments\/\d+(\?variant=thumbnail)?$/.test(src.split("#")[0]);
}
