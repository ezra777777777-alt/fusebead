"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alipayProvider = void 0;
const alipay_sdk_1 = require("alipay-sdk");
const config_1 = require("../config");
function createSdk() {
    return new alipay_sdk_1.AlipaySdk({
        appId: config_1.paymentConfig.alipay.appId,
        privateKey: config_1.paymentConfig.alipay.privateKey,
        alipayPublicKey: config_1.paymentConfig.alipay.publicKey,
        gateway: config_1.paymentConfig.alipay.gateway,
        signType: "RSA2",
    });
}
exports.alipayProvider = {
    name: "alipay",
    isAvailable() {
        return (0, config_1.isAlipayConfigured)();
    },
    async createOrder(params) {
        if (!(0, config_1.isAlipayConfigured)()) {
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
            notifyUrl: params.notifyUrl || config_1.paymentConfig.alipay.notifyUrl,
        });
        return {
            outTradeNo: params.orderNo,
            qrCode: result.qrCode || result.qr_code || "",
        };
    },
    async queryOrder(outTradeNo) {
        if (!(0, config_1.isAlipayConfigured)()) {
            return { paid: false };
        }
        const sdk = createSdk();
        const result = await sdk.exec("alipay.trade.query", {
            bizContent: { out_trade_no: outTradeNo },
        });
        const status = result.tradeStatus || result.trade_status || "";
        return { paid: status === "TRADE_SUCCESS" || status === "TRADE_FINISHED" };
    },
    async verifyWebhook(data) {
        if (!(0, config_1.isAlipayConfigured)()) {
            return { orderNo: data?.out_trade_no || "", paid: data?.trade_status === "TRADE_SUCCESS" };
        }
        const sdk = createSdk();
        const ok = sdk.checkNotifySign(data);
        if (!ok)
            throw new Error("Invalid Alipay signature");
        const tradeStatus = data?.trade_status || "";
        return {
            orderNo: data?.out_trade_no || "",
            paid: tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED",
        };
    },
};
async function simulatedCreate(params) {
    return {
        outTradeNo: params.orderNo,
        qrCode: `SIMULATED_ALIPAY_QR_${params.orderNo}_${params.amount}CNY`,
    };
}
