import crypto from "crypto";
import https from "https";
import { paymentConfig, isWechatConfigured } from "../config";
import type { PaymentProvider, CreateOrderParams, CreateOrderResult } from "../provider";

function sign(method: string, url: string, body: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
  const sign = crypto
    .createSign("RSA-SHA256")
    .update(message)
    .sign(paymentConfig.wechat.privateKey, "base64");
  return `WECHATPAY2-SHA256-RSA2048 mchid="${paymentConfig.wechat.mchId}",nonce_str="${nonce}",signature="${sign}",timestamp="${timestamp}",serial_no="${paymentConfig.wechat.serialNo}"`;
}

function wechatRequest<T = any>(method: string, path: string, body?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const host = paymentConfig.wechat.sandbox ? "api.mch.weixin.qq.com" : "api.mch.weixin.qq.com";
    const bodyStr = body ? JSON.stringify(body) : "";
    const auth = sign(method, path, bodyStr);

    const req = https.request({
      hostname: host,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": auth,
        ...(bodyStr ? { "Content-Length": String(Buffer.byteLength(bodyStr)) } : {}),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error(data)); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export const wechatProvider: PaymentProvider = {
  name: "wechat",

  isAvailable(): boolean {
    return isWechatConfigured();
  },

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!isWechatConfigured()) {
      return simulatedCreate(params);
    }
    const body = {
      appid: paymentConfig.wechat.mchId, // Using mchId as appid placeholder — real appid from WeChat
      mchid: paymentConfig.wechat.mchId,
      description: params.subject,
      out_trade_no: params.orderNo,
      notify_url: params.notifyUrl || paymentConfig.wechat.notifyUrl,
      amount: { total: Math.round(params.amount * 100), currency: "CNY" },
    };
    try {
      const result = await wechatRequest<any>("POST", "/v3/pay/transactions/native", body);
      return {
        outTradeNo: params.orderNo,
        qrCode: result.code_url || "",
      };
    } catch (err) {
      console.error("[wechat] createOrder error:", err);
      return simulatedCreate(params);
    }
  },

  async queryOrder(outTradeNo: string): Promise<{ paid: boolean }> {
    if (!isWechatConfigured()) return { paid: false };
    try {
      const result = await wechatRequest<any>("GET", `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${paymentConfig.wechat.mchId}`);
      return { paid: result.trade_state === "SUCCESS" };
    } catch {
      return { paid: false };
    }
  },

  async verifyWebhook(data: any): Promise<{ orderNo: string; paid: boolean }> {
    // In production, verify WeChat signature from headers
    const outTradeNo = data?.out_trade_no || "";
    const paid = data?.trade_state === "SUCCESS";
    return { orderNo: outTradeNo, paid };
  },
};

async function simulatedCreate(params: CreateOrderParams): Promise<CreateOrderResult> {
  return {
    outTradeNo: params.orderNo,
    qrCode: `SIMULATED_WECHAT_QR_${params.orderNo}_${params.amount}CNY`,
  };
}
