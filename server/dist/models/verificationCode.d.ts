export interface VerificationCodeRow {
    id: number;
    email: string;
    code: string;
    type: "captcha" | "email_verify" | "password_reset";
    expires_at: string;
    created_at: string;
}
export declare function create(params: {
    email: string;
    code: string;
    type: "captcha" | "email_verify" | "password_reset";
    ttlMinutes?: number;
}): Promise<VerificationCodeRow>;
export declare function verify(params: {
    email: string;
    code: string;
    type: "captcha" | "email_verify" | "password_reset";
}): Promise<boolean>;
export declare function cleanupExpired(): Promise<void>;
export declare function hasRecentCode(email: string, type: string, withinSeconds?: number): Promise<boolean>;
