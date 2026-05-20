export interface FavoriteRow {
    id: number;
    user_id: number;
    pattern_id: number;
    created_at: string;
}
export declare function findByUser(userId: number): Promise<any[]>;
export declare function add(userId: number, patternId: number): Promise<void>;
export declare function remove(userId: number, patternId: number): Promise<void>;
export declare function isFavorited(userId: number, patternId: number): Promise<boolean>;
