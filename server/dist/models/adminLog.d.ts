export interface AdminLogRow {
    id: number;
    admin_id: number;
    action: string;
    target_type: string | null;
    target_id: number | null;
    detail: string | null;
    created_at: string;
    admin_name?: string;
}
export declare function create(adminId: number, action: string, targetType?: string, targetId?: number, detail?: string): Promise<void>;
export declare function findAll(page?: number, limit?: number): Promise<{
    logs: AdminLogRow[];
    total: number;
}>;
