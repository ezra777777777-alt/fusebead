export interface FeedbackRow {
    id: number;
    user_id: number;
    subject: string;
    message: string;
    is_read: number;
    created_at: string;
}
export declare function create(data: {
    user_id: number;
    subject: string;
    message: string;
}): Promise<FeedbackRow>;
export declare function findAll(page?: number, limit?: number): Promise<{
    feedbacks: (FeedbackRow & {
        username: string;
        email: string;
    })[];
    total: number;
}>;
export declare function markRead(id: number): Promise<void>;
export declare function markAllRead(): Promise<void>;
export declare function getUnreadCount(): Promise<number>;
