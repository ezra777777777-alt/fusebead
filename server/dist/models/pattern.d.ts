export interface PatternRow {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    category: string | null;
    brand: string;
    grid_size: number;
    grid_data: string;
    color_counts: string | null;
    thumbnail_url: string | null;
    likes_count: number;
    downloads_count: number;
    is_public: boolean;
    is_approved: boolean;
    is_featured: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}
export interface PatternFilters {
    category?: string;
    sort?: "newest" | "popular";
    page?: number;
    limit?: number;
    userId?: number;
    search?: string;
}
export declare function findAll(filters?: PatternFilters): Promise<{
    patterns: any[];
    total: number;
}>;
export declare function findById(id: number): Promise<PatternRow | null>;
export declare function findByUserId(userId: number): Promise<PatternRow[]>;
export declare function create(data: {
    userId: number;
    title: string;
    description?: string;
    category?: string;
    brand: string;
    gridSize: number;
    gridData: string;
    colorCounts?: string;
    isPublic?: boolean;
}): Promise<PatternRow>;
export declare function remove(id: number, userId: number): Promise<boolean>;
export declare function incrementLikes(id: number): Promise<void>;
export declare function incrementDownloads(id: number): Promise<void>;
export declare function findAllAdmin(opts?: {
    status?: "all" | "pending" | "approved" | "deleted";
    page?: number;
    limit?: number;
    search?: string;
}): Promise<{
    patterns: any[];
    total: number;
}>;
export declare function updateAdmin(id: number, data: {
    is_approved?: boolean;
    is_featured?: boolean;
    is_deleted?: boolean;
}): Promise<boolean>;
export declare function getStats(): Promise<{
    totalPatterns: number;
    pendingPatterns: number;
    todayPatterns: number;
}>;
