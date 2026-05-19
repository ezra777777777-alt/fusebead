import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth";
import { patternsRouter } from "./routes/patterns";
import { toolRouter } from "./routes/tool";
import { userRouter } from "./routes/user";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/patterns", patternsRouter);
app.use("/api/tool", toolRouter);
app.use("/api/user", userRouter);

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
