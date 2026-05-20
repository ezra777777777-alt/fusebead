import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  userId: number;
  plan: string;
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

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid token" });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.slice(7), getJwtSecret()) as AuthPayload;
      req.user = decoded;
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function refreshToken(oldPayload: AuthPayload, newPlan: string): string {
  return signToken({ userId: oldPayload.userId, plan: newPlan });
}
