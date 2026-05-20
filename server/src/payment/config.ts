function env(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

export const paymentConfig = {
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

export function isAlipayConfigured(): boolean {
  return !!paymentConfig.alipay.appId && !!paymentConfig.alipay.privateKey;
}

export function isWechatConfigured(): boolean {
  return !!paymentConfig.wechat.mchId && !!paymentConfig.wechat.privateKey;
}
