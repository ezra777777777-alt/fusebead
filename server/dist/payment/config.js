"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentConfig = void 0;
exports.isAlipayConfigured = isAlipayConfigured;
exports.isWechatConfigured = isWechatConfigured;
function env(key, fallback = "") {
    return process.env[key] || fallback;
}
exports.paymentConfig = {
    alipay: {
        appId: env("ALIPAY_APP_ID"),
        privateKey: env("ALIPAY_PRIVATE_KEY"),
        publicKey: env("ALIPAY_PUBLIC_KEY"),
        sandbox: env("ALIPAY_SANDBOX", "true") === "true",
        notifyUrl: env("ALIPAY_NOTIFY_URL"),
        gateway: env("ALIPAY_SANDBOX", "true") === "true"
            ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
            : "https://openapi.alipay.com/gateway.do",
    },
    wechat: {
        mchId: env("WECHAT_MCH_ID"),
        serialNo: env("WECHAT_SERIAL_NO"),
        privateKey: env("WECHAT_PRIVATE_KEY"),
        apiV3Key: env("WECHAT_API_V3_KEY"),
        sandbox: env("WECHAT_SANDBOX", "true") === "true",
        notifyUrl: env("WECHAT_NOTIFY_URL"),
    },
    appBaseUrl: env("APP_BASE_URL", "http://localhost:3001"),
};
function isAlipayConfigured() {
    return !!exports.paymentConfig.alipay.appId && !!exports.paymentConfig.alipay.privateKey;
}
function isWechatConfigured() {
    return !!exports.paymentConfig.wechat.mchId && !!exports.paymentConfig.wechat.privateKey;
}
