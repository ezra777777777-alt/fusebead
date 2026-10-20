declare function usePg(): boolean;
export declare function enableResourceRegistryMigration(): void;
export declare function enableProjectAttachmentsMigration(): void;
export declare function query<T = any>(sql: string, params?: any[]): Promise<T>;
export declare function lockResourceRegistry(): Promise<void>;
export declare function transaction<T>(work: () => Promise<T>): Promise<T>;
export default usePg;
