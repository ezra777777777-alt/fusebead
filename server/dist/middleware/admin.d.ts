import { Request, Response, NextFunction } from "express";
export declare function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function adminGuard(req: Request, res: Response, next: NextFunction): void;
