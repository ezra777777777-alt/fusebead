import { AlipaySdk } from "alipay-sdk";
import { paymentConfig, isAlipayConfigured } from "../config";
import type { PaymentProvider, CreateOrderParams, CreateOrderResult } from "../provider";

function createSdk(): any {
  return new AlipaySdk({
    appId: paymentConfig.alipay.appId,
    privateKey: paymentConfig.alipay.privateKey,
    alipayPublicKey: paymentConfig.alipay.publicKey,
    gateway: paymentConfig.alipay.gateway,
    signType: "RSA2",
  });
}

export const alipayProvider: PaymentProvider = {
  name: "alipay",

  isAvailable(): boolean {
    return isAlipayConfigured();
  },

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!isAlipayConfigured()) {
      return simulatedCreate(params);
    }
    const sdk = createSdk();
    const result = await sdk.exec("alipay.trade.precreate", {
      bizContent: {
        out_trade_no: params.orderNo,
        total_amount: params.amount.toFixed(2),
        subject: params.subject,
        timeout_express: "30m",
      },
      notifyUrl: params.notifyUrl || paymentConfig.alipay.notifyUrl,
    });
    return {
      outTradeNo: params.orderNo,
      qrCode: (result as any).qrCode || (result as any).qr_code || "",
    };
  },

  async queryOrder(outTradeNo: string): Promise<{ paid: boolean }> {
    if (!isAlipayConfigured()) {
      return { paid: false };
    }
    const sdk = createSdk();
    const result = await sdk.exec("alipay.trade.query", {
      bizContent: { out_trade_no: outTradeNo },
    });
    const status = (result as any).tradeStatus || (result as any).trade_status || "";
    return { paid: status === "TRADE_SUCCESS" || status === "TRADE_FINISHED" };
  },

  async verifyWebhook(data: any): Promise<{ orderNo: string; paid: boolean }> {
    if (!isAlipayConfigured()) {
      return { orderNo: data?.out_trade_no || "", paid: data?.trade_status === "TRADE_SUCCESS" };
    }
    const sdk = createSdk();
    const ok = sdk.checkNotifySign(data as any);
    if (!ok) throw new Error("Invalid Alipay signature");
    const tradeStatus = data?.trade_status || "";
    return {
      orderNo: data?.out_trade_no || "",
      paid: tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED",
    };
  },
};

async function simulatedCreate(params: CreateOrderParams): Promise<CreateOrderResult> {
  return {
    outTradeNo: params.orderNo,
    qrCode: `SIMULATED_ALIPAY_QR_${params.orderNo}_${params.amount}CNY`,
  };
}
