/** Public community works use projects.status === "approved" and is_deleted = 0. */

export type ApprovalFields = {
  status?: string | null;
  is_deleted?: unknown;
};

export type LoadPhase = "loading" | "error" | "ready";

export type LoadState<T> = {
  phase: LoadPhase;
  skeleton: boolean;
  error: string;
  data: T | null;
  canRetry: boolean;
};

export function isRemovedWork(value: unknown): boolean {
  if (value === true || value === "1") return true;
  return typeof value === "number" && value !== 0;
}

export function isPublicApprovedWork(work: ApprovalFields | null | undefined): boolean {
  if (!work) return false;
  const status = typeof work.status === "string" ? work.status.trim() : "";
  return status === "approved" && !isRemovedWork(work.is_deleted);
}

export function approvedWorksOnly<T extends ApprovalFields>(works: readonly T[] | null | undefined): T[] {
  if (!Array.isArray(works)) return [];
  return works.filter(isPublicApprovedWork);
}

export function loadingState<T>(): LoadState<T> {
  return { phase: "loading", skeleton: true, error: "", data: null, canRetry: false };
}

export function failureReason(error: unknown, fallback = "加载失败，请稍后重试"): string {
  const raw = typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : "";
  const message = raw.replace(/\s+/g, " ").trim();
  if (!message) return fallback;
  return message.length > 160 ? `${message.slice(0, 160)}…` : message;
}

export function errorState<T>(error: unknown, fallback?: string): LoadState<T> {
  return { phase: "error", skeleton: false, error: failureReason(error, fallback), data: null, canRetry: true };
}

export function readyState<T>(data: T): LoadState<T> {
  return { phase: "ready", skeleton: false, error: "", data, canRetry: false };
}

export async function runRequest<T>(request: () => Promise<T>, fallback?: string): Promise<LoadState<T>> {
  try {
    return readyState(await request());
  } catch (error) {
    return errorState(error, fallback);
  }
}
