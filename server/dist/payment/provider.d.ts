export interface CreateOrderParams {
    orderNo: string;
    plan: "pro" | "team";
    amount: number;
    subject: string;
    notifyUrl: string;
}
export interface CreateOrderResult {
    outTradeNo: string;
    qrCode: string;
}
export interface PaymentProvider {
    name: "alipay" | "wechat";
    createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
    queryOrder(outTradeNo: string): Promise<{
        paid: boolean;
    }>;
    verifyWebhook(data: any): Promise<{
        orderNo: string;
        paid: boolean;
    }>;
    isAvailable(): boolean;
}
export declare function registerProvider(provider: PaymentProvider): void;
export declare function getProvider(name: string): PaymentProvider | null;
