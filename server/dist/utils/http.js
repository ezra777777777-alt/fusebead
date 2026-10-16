"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.asyncRoute = asyncRoute;
exports.positiveInt = positiveInt;
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.HttpError = HttpError;
function asyncRoute(handler) {
    return (req, res, next) => { Promise.resolve(handler(req, res)).catch(next); };
}
function positiveInt(value, fallback) {
    if (value === undefined && fallback !== undefined)
        return fallback;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1)
        throw new HttpError(400, "编号或页码无效");
    return number;
}
