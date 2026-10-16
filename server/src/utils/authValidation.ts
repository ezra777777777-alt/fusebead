import { HttpError } from "./http";

export function emailAddress(value: unknown): string {
  if (typeof value !== "string") throw new HttpError(400, "请填写有效邮箱");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "请填写有效邮箱");
  return email;
}

export function validateNewPassword(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length < 8 || Buffer.byteLength(value, "utf8") > 72) {
    throw new HttpError(400, "密码至少 8 位，最多 72 字节（中文占多个字节）");
  }
}
