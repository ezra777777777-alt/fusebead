import { RequestHandler } from "express";
export declare function rateLimit(limit: number, windowMs?: number): RequestHandler;
