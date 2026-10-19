export declare const resourceRegistryRouter: import("express-serve-static-core").Router;
export declare function checkResource(body: Record<string, unknown>): Promise<any>;
export declare function checkWebsiteResource(id: number, revision: number, url: string, proof?: unknown): Promise<void>;
export declare function releaseWebsiteResource(id: number, url: string, reason: "changed" | "withdrawn" | "rejected", nextUrl?: string): Promise<void>;
export declare function markWebsiteResourcePublished(id: number, url: string): Promise<void>;
