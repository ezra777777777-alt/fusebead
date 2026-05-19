import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as User from "../models/user";
import { signToken } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password_hash });
    const token = signToken({ userId: user.id, plan: user.plan });

    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
  } catch (err) {
    console.error("[auth] register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Missing email or password" });
      return;
    }

    const user = await User.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user.id, plan: user.plan });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan, avatar_url: user.avatar_url } });
  } catch (err) {
    console.error("[auth] login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
