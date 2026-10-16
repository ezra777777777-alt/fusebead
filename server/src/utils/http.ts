import { Request, Response, NextFunction, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next: NextFunction) => { Promise.resolve(handler(req, res)).catch(next); };
}

export function positiveInt(value: unknown, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new HttpError(400, "编号或页码无效");
  return number;
}
