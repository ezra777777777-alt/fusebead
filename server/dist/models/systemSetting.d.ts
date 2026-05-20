export interface SystemSettingRow {
    id: number;
    setting_key: string;
    setting_value: string | null;
    updated_at: string;
}
export declare function getAll(): Promise<Record<string, string>>;
export declare function set(key: string, value: string): Promise<void>;
export declare function setMany(settings: {
    key: string;
    value: string;
}[]): Promise<void>;
