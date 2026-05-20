import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { patternsRouter } from "./routes/patterns";
import { toolRouter } from "./routes/tool";
import { userRouter } from "./routes/user";
import { adminRouter } from "./routes/admin";
import { verificationRouter } from "./routes/verification";
import { paymentsRouter } from "./routes/payments";
import { cleanupExpired } from "./models/verificationCode";
import { checkSubscriptionExpiry } from "./models/user";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", verificationRouter);
app.use("/api/auth", authRouter);
app.use("/api/patterns", patternsRouter);
app.use("/api/tool", toolRouter);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payments", paymentsRouter);

app.listen(Number(PORT), HOST, () => {
  console.log(`[Server] Running on http://${HOST}:${PORT}`);
});

// Cleanup expired verification codes every 5 minutes
setInterval(() => {
  cleanupExpired().catch(() => {});
}, 5 * 60 * 1000);

// Check expired subscriptions every hour
setInterval(() => {
  checkSubscriptionExpiry().then((n) => {
    if (n > 0) console.log(`[Server] Downgraded ${n} expired subscriptions`);
  }).catch(() => {});
}, 60 * 60 * 1000);
