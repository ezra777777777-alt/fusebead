"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rateLimit_1 = require("./middleware/rateLimit");
const http_1 = require("./utils/http");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const patterns_1 = require("./routes/patterns");
const tool_1 = require("./routes/tool");
const user_1 = require("./routes/user");
const admin_1 = require("./routes/admin");
const verification_1 = require("./routes/verification");
const payments_1 = require("./routes/payments");
const projects_1 = require("./routes/projects");
const resource_registry_1 = require("./routes/resource-registry");
const verificationCode_1 = require("./models/verificationCode");
const user_2 = require("./models/user");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Nginx connects over loopback; keep anonymous rate limits separate for each visitor.
app.set("trust proxy", "loopback");
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: "10mb" }));
// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Routes
app.use("/api/auth", (0, rateLimit_1.rateLimit)(40), verification_1.verificationRouter, auth_1.authRouter);
app.use("/api/patterns", patterns_1.patternsRouter);
app.use("/api/tool", tool_1.toolRouter);
app.use("/api/user", user_1.userRouter);
app.use("/api/admin", admin_1.adminRouter);
app.use("/api/payments", payments_1.paymentsRouter);
app.use("/api/projects", projects_1.projectsRouter);
if (process.env.RESOURCE_REGISTRY_KEY)
    app.use("/api/resource-registry", resource_registry_1.resourceRegistryRouter);
app.use((error, _req, res, _next) => {
    const status = error instanceof http_1.HttpError ? error.status : 500;
    if (status === 500)
        console.error("[server]", error.message);
    res.status(status).json({ error: status === 500 ? "服务暂时不可用，请稍后重试" : error.message });
});
app.listen(Number(PORT), HOST, () => {
    console.log(`[Server] Running on http://${HOST}:${PORT}`);
});
// Cleanup expired verification codes every 5 minutes
setInterval(() => {
    (0, verificationCode_1.cleanupExpired)().catch(() => { });
}, 5 * 60 * 1000);
// Check expired subscriptions every hour
setInterval(() => {
    (0, user_2.checkSubscriptionExpiry)().then((n) => {
        if (n > 0)
            console.log(`[Server] Downgraded ${n} expired subscriptions`);
    }).catch(() => { });
}, 60 * 60 * 1000);
