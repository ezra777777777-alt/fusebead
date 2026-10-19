export declare const resourceRegistryRouter: import("express-serve-static-core").Router;
export declare function guardWebsiteRegistry(): Promise<void>;
export declare function checkResource(body: Record<string, unknown>): Promise<any>;
export declare function checkWebsiteResource(id: number, revision: number, urls: string[]): Promise<void>;
export declare function releaseWebsiteResource(id: number, urls: string[], reason: "changed" | "withdrawn" | "rejected", nextUrls?: string[]): Promise<void>;
export declare function markWebsiteResourcePublished(id: number, urls: string[]): Promise<void>;
