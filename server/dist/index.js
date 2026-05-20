"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./routes/auth");
const patterns_1 = require("./routes/patterns");
const tool_1 = require("./routes/tool");
const user_1 = require("./routes/user");
const admin_1 = require("./routes/admin");
const verification_1 = require("./routes/verification");
const payments_1 = require("./routes/payments");
const verificationCode_1 = require("./models/verificationCode");
const user_2 = require("./models/user");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use((0, cors_1.default)({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express_1.default.json({ limit: "10mb" }));
// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Routes
app.use("/api/auth", verification_1.verificationRouter);
app.use("/api/auth", auth_1.authRouter);
app.use("/api/patterns", patterns_1.patternsRouter);
app.use("/api/tool", tool_1.toolRouter);
app.use("/api/user", user_1.userRouter);
app.use("/api/admin", admin_1.adminRouter);
app.use("/api/payments", payments_1.paymentsRouter);
app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
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
