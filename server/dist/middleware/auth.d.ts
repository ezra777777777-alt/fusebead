import { Request, Response, NextFunction } from "express";
export interface AuthPayload {
    userId: number;
    plan: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare function signToken(payload: AuthPayload): string;
export declare function refreshToken(oldPayload: AuthPayload, newPlan: string): string;
