export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  }).catch(() => { throw new ApiError("暂时无法连接服务，请检查网络后重试", 0); });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Network error" }));
    if (typeof window !== "undefined" && (body.code === "AUTH_REQUIRED" || body.code === "ACCOUNT_BANNED")) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth-invalid"));
    }
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status, body.code);
  }

  return res.json();
}
