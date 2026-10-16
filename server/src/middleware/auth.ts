import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as User from "../models/user";

export interface AuthPayload {
  userId: number;
  plan: string;
  isAdmin?: boolean;
  tokenVersion?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "fallback-secret") {
    if (process.env.NODE_ENV === "production") {
      console.error("[auth] FATAL: JWT_SECRET is not set in production");
      process.exit(1);
    }
    return "dev-secret-do-not-use-in-production";
  }
  return secret;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  let decoded: AuthPayload;
  try {
    decoded = jwt.verify(token || "", getJwtSecret()) as AuthPayload;
    if (!Number.isInteger(decoded.userId)) throw new Error("Invalid token");
  } catch {
    res.status(401).json({ error: "登录已失效，请重新登录", code: "AUTH_REQUIRED" });
    return;
  }
  try {
    const user = await User.findById(decoded.userId);
    if (user && (decoded.tokenVersion ?? 0) !== user.token_version) {
      res.status(401).json({ error: "密码已更新，请重新登录", code: "AUTH_REQUIRED" });
      return;
    }
    if (!user || user.is_banned || !user.email_verified) {
      res.status(user ? 403 : 401).json({
        error: user?.is_banned ? "账号已被封禁，如有异议请通过社区反馈申诉" : "请先完成邮箱验证",
        code: user?.is_banned ? "ACCOUNT_BANNED" : "AUTH_REQUIRED",
      });
      return;
    }
    req.user = { userId: user.id, plan: user.plan, isAdmin: !!user.is_admin, tokenVersion: user.token_version };
    next();
  } catch (error) { next(error); }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  let decoded: AuthPayload | null = null;
  try { if (token) decoded = jwt.verify(token, getJwtSecret()) as AuthPayload; } catch { /* visitor */ }
  try {
    if (decoded && Number.isInteger(decoded.userId)) {
      const user = await User.findById(decoded.userId);
      if (user && !user.is_banned && user.email_verified && (decoded.tokenVersion ?? 0) === user.token_version) req.user = { userId: user.id, plan: user.plan, isAdmin: !!user.is_admin, tokenVersion: user.token_version };
    }
    next();
  } catch (error) { next(error); }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function refreshToken(oldPayload: AuthPayload, newPlan: string): string {
  return signToken({ userId: oldPayload.userId, plan: newPlan, tokenVersion: oldPayload.tokenVersion });
}
