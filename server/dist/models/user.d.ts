export interface UserRow {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    avatar_url: string | null;
    plan: "free" | "pro" | "team";
    is_admin: boolean;
    is_banned: boolean;
    email_verified: number;
    subscription_expires_at: string | null;
    subscription_status: string;
    created_at: string;
    updated_at: string;
}
export declare function findByEmail(email: string): Promise<UserRow | null>;
export declare function findById(id: number): Promise<UserRow | null>;
export declare function create(data: {
    username: string;
    email: string;
    password_hash: string;
    email_verified?: number;
}): Promise<UserRow>;
export declare function verifyEmail(email: string): Promise<boolean>;
export declare function update(id: number, data: Partial<Pick<UserRow, "username" | "avatar_url">>): Promise<void>;
export declare function findAll(opts?: {
    page?: number;
    limit?: number;
    search?: string;
}): Promise<{
    users: UserRow[];
    total: number;
}>;
export declare function updateAdmin(id: number, data: Partial<Pick<UserRow, "plan" | "is_banned" | "is_admin">>): Promise<boolean>;
export declare function getStats(): Promise<{
    totalUsers: number;
    todayUsers: number;
}>;
export declare function upgradePlan(id: number, plan: "pro" | "team", expiresAt: string): Promise<void>;
export declare function updatePassword(id: number, password_hash: string): Promise<void>;
export declare function checkSubscriptionExpiry(): Promise<number>;
