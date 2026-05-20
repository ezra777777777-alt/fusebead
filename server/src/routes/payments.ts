import { Router, Request, Response } from "express";
import crypto from "crypto";
import { authMiddleware } from "../middleware/auth";
import * as Order from "../models/order";
import * as User from "../models/user";
import { paymentConfig } from "../payment/config";
import { registerProvider, getProvider } from "../payment/provider";
import { alipayProvider } from "../payment/providers/alipay";
import { wechatProvider } from "../payment/providers/wechat";

registerProvider(alipayProvider);
registerProvider(wechatProvider);

export const paymentsRouter = Router();

const PLAN_PRICES: Record<string, number> = { pro: 29, team: 69 };
const PLAN_DURATION_DAYS = 30;

function generateOrderNo(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `FB-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

// Create payment order
paymentsRouter.post("/create", authMiddleware, async (req: Request, res: Response) => {
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

    const providerImpl = getProvider(provider);
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
        ? paymentConfig.alipay.notifyUrl
        : paymentConfig.wechat.notifyUrl,
    });

    await Order.create({
      user_id: req.user!.userId,
      order_no: orderNo,
      provider: provider as "alipay" | "wechat",
      plan: plan as "pro" | "team",
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
  } catch (err) {
    console.error("[payments] create error:", err);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// Poll order status
paymentsRouter.get("/order/:orderNo", authMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await Order.findByOrderNo(req.params.orderNo);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.user_id !== req.user!.userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    res.json({ status: order.status, plan: order.plan, amount: order.amount });
  } catch (err) {
    console.error("[payments] order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List user orders
paymentsRouter.get("/orders", authMiddleware, async (req: Request, res: Response) => {
  try {
    const orders = await Order.findByUser(req.user!.userId);
    res.json(orders);
  } catch (err) {
    console.error("[payments] orders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel pending order
paymentsRouter.post("/cancel/:orderNo", authMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await Order.findByOrderNo(req.params.orderNo);
    if (!order || order.user_id !== req.user!.userId) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.status !== "pending") {
      res.status(400).json({ error: "Order cannot be cancelled" });
      return;
    }
    await Order.updateStatus(order.order_no, "cancelled");
    res.json({ success: true });
  } catch (err) {
    console.error("[payments] cancel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simulate payment (dev only — for testing without real credentials)
paymentsRouter.post("/simulate/:orderNo", authMiddleware, async (req: Request, res: Response) => {
  try {
    const order = await Order.findByOrderNo(req.params.orderNo);
    if (!order || order.user_id !== req.user!.userId) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.status !== "pending") {
      res.status(400).json({ error: "Order already processed" });
      return;
    }
    await completePayment(order.order_no);
    res.json({ success: true });
  } catch (err) {
    console.error("[payments] simulate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function completePayment(orderNo: string) {
  const order = await Order.findByOrderNo(orderNo);
  if (!order || order.status !== "pending") return;

  await Order.updateStatus(orderNo, "paid", { paid_at: new Date().toISOString() });

  const expiresAt = order.subscription_expires_at
    || new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await User.upgradePlan(order.user_id, order.plan, expiresAt);
}

// Alipay webhook
paymentsRouter.post("/webhook/alipay", async (req: Request, res: Response) => {
  try {
    const { orderNo, paid } = await alipayProvider.verifyWebhook(req.body);
    if (paid && orderNo) {
      await completePayment(orderNo);
    }
    res.send("success");
  } catch (err) {
    console.error("[payments] alipay webhook error:", err);
    res.send("fail");
  }
});

// WeChat Pay webhook
paymentsRouter.post("/webhook/wechat", async (req: Request, res: Response) => {
  try {
    const { orderNo, paid } = await wechatProvider.verifyWebhook(req.body);
    if (paid && orderNo) {
      await completePayment(orderNo);
    }
    res.json({ code: "SUCCESS", message: "OK" });
  } catch (err) {
    console.error("[payments] wechat webhook error:", err);
    res.json({ code: "FAIL", message: "Internal error" });
  }
});
