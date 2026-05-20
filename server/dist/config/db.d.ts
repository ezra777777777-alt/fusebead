declare function usePg(): boolean;
export declare function query<T = any>(sql: string, params?: any[]): Promise<T>;
export default usePg;
