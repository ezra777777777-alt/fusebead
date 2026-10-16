import { Request, Response, RequestHandler } from "express";
export declare class HttpError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler;
export declare function positiveInt(value: unknown, fallback?: number): number;
