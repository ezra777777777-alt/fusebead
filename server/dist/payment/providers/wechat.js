"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wechatProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const https_1 = __importDefault(require("https"));
const config_1 = require("../config");
function sign(method, url, body) {
    const nonce = crypto_1.default.randomBytes(16).toString("hex");
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    const sign = crypto_1.default
        .createSign("RSA-SHA256")
        .update(message)
        .sign(config_1.paymentConfig.wechat.privateKey, "base64");
    return `WECHATPAY2-SHA256-RSA2048 mchid="${config_1.paymentConfig.wechat.mchId}",nonce_str="${nonce}",signature="${sign}",timestamp="${timestamp}",serial_no="${config_1.paymentConfig.wechat.serialNo}"`;
}
function wechatRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const host = config_1.paymentConfig.wechat.sandbox ? "api.mch.weixin.qq.com" : "api.mch.weixin.qq.com";
        const bodyStr = body ? JSON.stringify(body) : "";
        const auth = sign(method, path, bodyStr);
        const req = https_1.default.request({
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
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error(data));
                }
            });
        });
        req.on("error", reject);
        if (bodyStr)
            req.write(bodyStr);
        req.end();
    });
}
exports.wechatProvider = {
    name: "wechat",
    isAvailable() {
        return (0, config_1.isWechatConfigured)();
    },
    async createOrder(params) {
        if (!(0, config_1.isWechatConfigured)()) {
            return simulatedCreate(params);
        }
        const body = {
            appid: config_1.paymentConfig.wechat.mchId, // Using mchId as appid placeholder — real appid from WeChat
            mchid: config_1.paymentConfig.wechat.mchId,
            description: params.subject,
            out_trade_no: params.orderNo,
            notify_url: params.notifyUrl || config_1.paymentConfig.wechat.notifyUrl,
            amount: { total: Math.round(params.amount * 100), currency: "CNY" },
        };
        try {
            const result = await wechatRequest("POST", "/v3/pay/transactions/native", body);
            return {
                outTradeNo: params.orderNo,
                qrCode: result.code_url || "",
            };
        }
        catch (err) {
            console.error("[wechat] createOrder error:", err);
            return simulatedCreate(params);
        }
    },
    async queryOrder(outTradeNo) {
        if (!(0, config_1.isWechatConfigured)())
            return { paid: false };
        try {
            const result = await wechatRequest("GET", `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${config_1.paymentConfig.wechat.mchId}`);
            return { paid: result.trade_state === "SUCCESS" };
        }
        catch {
            return { paid: false };
        }
    },
    async verifyWebhook(data) {
        // In production, verify WeChat signature from headers
        const outTradeNo = data?.out_trade_no || "";
        const paid = data?.trade_state === "SUCCESS";
        return { orderNo: outTradeNo, paid };
    },
};
async function simulatedCreate(params) {
    return {
        outTradeNo: params.orderNo,
        qrCode: `SIMULATED_WECHAT_QR_${params.orderNo}_${params.amount}CNY`,
    };
}
