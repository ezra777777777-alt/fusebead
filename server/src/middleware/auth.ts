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

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid token" });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as AuthPayload;
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
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || "fallback-secret") as AuthPayload;
      req.user = decoded;
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" });
}
