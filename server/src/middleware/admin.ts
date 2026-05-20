import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./auth";
import * as User from "../models/user";

export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user || !user.is_admin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  authMiddleware(req, res, () => {
    adminMiddleware(req, res, next);
  });
}
