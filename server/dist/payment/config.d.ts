export declare const paymentConfig: {
    alipay: {
        appId: string;
        privateKey: string;
        publicKey: string;
        sandbox: boolean;
        notifyUrl: string;
        gateway: string;
    };
    wechat: {
        mchId: string;
        serialNo: string;
        privateKey: string;
        apiV3Key: string;
        sandbox: boolean;
        notifyUrl: string;
    };
    appBaseUrl: string;
};
export declare function isAlipayConfigured(): boolean;
export declare function isWechatConfigured(): boolean;
