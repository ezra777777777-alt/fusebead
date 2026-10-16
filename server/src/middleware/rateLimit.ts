import { RequestHandler } from "express";

// shortcut: 单进程限流，多实例部署前迁移到共享存储。
export function rateLimit(limit: number, windowMs = 60_000): RequestHandler {
  const requests = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of requests) if (value.until <= now) requests.delete(key);
    const key = String(req.user?.userId ?? req.ip);
    const value = requests.get(key) ?? { count: 0, until: now + windowMs };
    requests.set(key, value);
    if (++value.count > limit) {
      res.setHeader("Retry-After", Math.ceil((value.until - now) / 1000));
      res.status(429).json({ error: "操作太频繁，请稍后再试" });
      return;
    }
    next();
  };
}
