"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const Order = __importStar(require("../models/order"));
const User = __importStar(require("../models/user"));
const config_1 = require("../payment/config");
const provider_1 = require("../payment/provider");
const alipay_1 = require("../payment/providers/alipay");
const wechat_1 = require("../payment/providers/wechat");
(0, provider_1.registerProvider)(alipay_1.alipayProvider);
(0, provider_1.registerProvider)(wechat_1.wechatProvider);
exports.paymentsRouter = (0, express_1.Router)();
const PLAN_PRICES = { pro: 29, team: 69 };
const PLAN_DURATION_DAYS = 30;
function generateOrderNo() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `FB-${date}-${crypto_1.default.randomUUID().slice(0, 8).toUpperCase()}`;
}
// Create payment order
exports.paymentsRouter.post("/create", auth_1.authMiddleware, async (req, res) => {
    try {
        const { plan, provider } = req.body;
        if (!plan || !["pro", "team"].includes(plan)) {
            res.status(400).json({ error: "Invalid plan" });
            return;
        }
        if (!provider || !["alipay", "wechat"].includes(provider)) {
            res.status(400).json({ error: "Invalid payment provider" });
            return;
        }
        const providerImpl = (0, provider_1.getProvider)(provider);
        if (!providerImpl) {
            res.status(400).json({ error: "Payment provider not available" });
            return;
        }
        const amount = PLAN_PRICES[plan];
        const orderNo = generateOrderNo();
        const expiresAt = new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const result = await providerImpl.createOrder({
            orderNo,
            plan,
            amount,
            subject: `FuseBead ${plan === "pro" ? "Pro" : "Team"} — ${amount} CNY / month`,
            notifyUrl: provider === "alipay"
                ? config_1.paymentConfig.alipay.notifyUrl
                : config_1.paymentConfig.wechat.notifyUrl,
        });
        await Order.create({
            user_id: req.user.userId,
            order_no: orderNo,
            provider: provider,
            plan: plan,
            amount,
            out_trade_no: result.outTradeNo,
            qr_code: result.qrCode,
            subscription_expires_at: expiresAt,
        });
        res.json({
            orderNo,
            qrCode: result.qrCode,
            amount,
            plan,
            provider,
            simulated: !providerImpl.isAvailable(),
        });
    }
    catch (err) {
        console.error("[payments] create error:", err);
        res.status(500).json({ error: "Failed to create payment order" });
    }
});
// Poll order status
exports.paymentsRouter.get("/order/:orderNo", auth_1.authMiddleware, async (req, res) => {
    try {
        const order = await Order.findByOrderNo(req.params.orderNo);
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        if (order.user_id !== req.user.userId) {
            res.status(403).json({ error: "Unauthorized" });
            return;
        }
        res.json({ status: order.status, plan: order.plan, amount: order.amount });
    }
    catch (err) {
        console.error("[payments] order error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// List user orders
exports.paymentsRouter.get("/orders", auth_1.authMiddleware, async (req, res) => {
    try {
        const orders = await Order.findByUser(req.user.userId);
        res.json(orders);
    }
    catch (err) {
        console.error("[payments] orders error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Cancel pending order
exports.paymentsRouter.post("/cancel/:orderNo", auth_1.authMiddleware, async (req, res) => {
    try {
        const order = await Order.findByOrderNo(req.params.orderNo);
        if (!order || order.user_id !== req.user.userId) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        if (order.status !== "pending") {
            res.status(400).json({ error: "Order cannot be cancelled" });
            return;
        }
        await Order.updateStatus(order.order_no, "cancelled");
        res.json({ success: true });
    }
    catch (err) {
        console.error("[payments] cancel error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Simulate payment (dev only — for testing without real credentials)
exports.paymentsRouter.post("/simulate/:orderNo", auth_1.authMiddleware, async (req, res) => {
    try {
        const order = await Order.findByOrderNo(req.params.orderNo);
        if (!order || order.user_id !== req.user.userId) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        if (order.status !== "pending") {
            res.status(400).json({ error: "Order already processed" });
            return;
        }
        await completePayment(order.order_no);
        res.json({ success: true });
    }
    catch (err) {
        console.error("[payments] simulate error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
async function completePayment(orderNo) {
    const order = await Order.findByOrderNo(orderNo);
    if (!order || order.status !== "pending")
        return;
    await Order.updateStatus(orderNo, "paid", { paid_at: new Date().toISOString() });
    const expiresAt = order.subscription_expires_at
        || new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await User.upgradePlan(order.user_id, order.plan, expiresAt);
}
// Alipay webhook
exports.paymentsRouter.post("/webhook/alipay", async (req, res) => {
    try {
        const { orderNo, paid } = await alipay_1.alipayProvider.verifyWebhook(req.body);
        if (paid && orderNo) {
            await completePayment(orderNo);
        }
        res.send("success");
    }
    catch (err) {
        console.error("[payments] alipay webhook error:", err);
        res.send("fail");
    }
});
// WeChat Pay webhook
exports.paymentsRouter.post("/webhook/wechat", async (req, res) => {
    try {
        const { orderNo, paid } = await wechat_1.wechatProvider.verifyWebhook(req.body);
        if (paid && orderNo) {
            await completePayment(orderNo);
        }
        res.json({ code: "SUCCESS", message: "OK" });
    }
    catch (err) {
        console.error("[payments] wechat webhook error:", err);
        res.json({ code: "FAIL", message: "Internal error" });
    }
});
