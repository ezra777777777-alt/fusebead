import { inflateSync } from "zlib";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_ATTACHMENTS = 8;
export const MAX_PIXELS = 12_000_000;

export class ImageRejected extends Error {}

export type SanitizedImage = { bytes: Buffer; mime: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };

const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "sRGB", "cHRM", "bKGD", "pHYs", "sBIT"]);

export function sanitizeImage(input: Buffer): SanitizedImage {
  if (!Buffer.isBuffer(input) || input.length < 12) throw new ImageRejected("请上传 PNG、JPEG 或 WebP 图片");
  if (input.length > MAX_IMAGE_BYTES) throw new ImageRejected("单张图片不能超过 2 MB");
  if (isPng(input)) return { bytes: sanitizePng(input), mime: "image/png", extension: "png" };
  if (isJpeg(input)) return { bytes: sanitizeJpeg(input), mime: "image/jpeg", extension: "jpg" };
  if (isWebp(input)) return { bytes: sanitizeWebp(input), mime: "image/webp", extension: "webp" };
  throw new ImageRejected("请上传 PNG、JPEG 或 WebP 图片");
}

function isPng(input: Buffer) {
  return input.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}
function isJpeg(input: Buffer) {
  return input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
}
function isWebp(input: Buffer) {
  return input.subarray(0, 4).toString("ascii") === "RIFF" && input.subarray(8, 12).toString("ascii") === "WEBP";
}

function reject(message = "请上传 PNG、JPEG 或 WebP 图片"): never {
  throw new ImageRejected(message);
}

function checkPixels(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) reject();
  if (width > MAX_PIXELS || height > MAX_PIXELS || width * height > MAX_PIXELS) reject("图片尺寸超过 1200 万像素");
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function sanitizePng(input: Buffer): Buffer {
  const signature = input.subarray(0, 8);
  const kept: Buffer[] = [signature];
  let offset = 8;
  let sawHeader = false;
  let sawData = false;
  let sawEnd = false;
  const idat: Buffer[] = [];
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset);
    if (length > input.length || offset + 12 + length > input.length) reject();
    const type = input.subarray(offset + 4, offset + 8).toString("ascii");
    if (!/^[A-Za-z]{4}$/.test(type)) reject();
    const typeAndData = input.subarray(offset + 4, offset + 8 + length);
    const expected = input.readUInt32BE(offset + 8 + length);
    if (crc32(typeAndData) !== expected) reject();
    const data = input.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (sawEnd) reject();
    if (!sawHeader && type !== "IHDR") reject();
    if (type === "IHDR") {
      if (sawHeader || data.length !== 13) reject();
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
      checkPixels(width, height);
      if (![1, 2, 4, 8, 16].includes(bitDepth) || ![0, 2, 3, 4, 6].includes(colorType) || data[10] !== 0 || data[11] !== 0 || interlace > 1) reject();
      sawHeader = true;
    }
    if (type === "IDAT") {
      sawData = true;
      idat.push(Buffer.from(data));
    }
    if (type === "IEND") {
      if (length !== 0 || !sawData) reject();
      sawEnd = true;
    }
    if (PNG_KEEP.has(type)) kept.push(input.subarray(offset - (12 + length), offset));
  }
  if (!sawEnd || offset !== input.length) reject();
  const samples = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType] || 0;
  if (!samples) reject();
  const expectedBytes = height * (1 + Math.ceil((width * bitDepth * samples) / 8));
  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(idat), { maxOutputLength: expectedBytes });
  } catch {
    reject();
  }
  if (interlace === 0 && inflated.length !== expectedBytes) reject();
  return Buffer.concat(kept);
}

function sanitizeJpeg(input: Buffer): Buffer {
  const out: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;
  // APP1–APP15 hold EXIF, ICC, IPTC and vendor metadata. APP0 (JFIF) stays.
  const strip = new Set<number>([0xfe]);
  for (let marker = 0xe1; marker <= 0xef; marker++) strip.add(marker);
  while (offset < input.length) {
    if (input[offset] !== 0xff) reject();
    while (offset < input.length - 1 && input[offset] === 0xff && input[offset + 1] === 0xff) offset++;
    if (offset + 1 >= input.length) reject();
    const marker = input[offset + 1];
    if (marker === 0xd8 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) reject();
    if (marker === 0xd9) {
      if (!sawFrame || !sawScan || offset + 2 !== input.length) reject();
      out.push(Buffer.from([0xff, 0xd9]));
      return Buffer.concat(out);
    }
    if (marker === 0xda) {
      // Progressive JPEG (SOF2) has several scans. A scan ends at the next marker, which may be another SOS.
      if (!sawFrame || offset + 4 > input.length) reject();
      const length = input.readUInt16BE(offset + 2);
      if (length < 8 || offset + 2 + length > input.length) reject();
      let cursor = offset + 2 + length;
      let scanEnd = -1;
      while (cursor < input.length) {
        if (input[cursor] !== 0xff) { cursor++; continue; }
        let probe = cursor;
        while (probe < input.length - 1 && input[probe + 1] === 0xff) probe++;
        if (probe + 1 >= input.length) reject();
        const next = input[probe + 1];
        if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) { cursor = probe + 2; continue; }
        scanEnd = cursor;
        break;
      }
      if (scanEnd < 0) reject();
      out.push(input.subarray(offset, scanEnd));
      offset = scanEnd;
      sawScan = true;
      continue;
    }
    if (offset + 4 > input.length) reject();
    const length = input.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > input.length) reject();
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) {
      if (length < 8) reject();
      checkPixels(input.readUInt16BE(offset + 7), input.readUInt16BE(offset + 5));
      sawFrame = true;
    }
    if (!strip.has(marker)) out.push(input.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }
  reject();
}

function sanitizeWebp(input: Buffer): Buffer {
  if (input.readUInt32LE(4) !== input.length - 8) reject();
  const chunks: { tag: string; data: Buffer }[] = [];
  let offset = 12;
  while (offset < input.length) {
    if (offset + 8 > input.length) reject();
    const tag = input.subarray(offset, offset + 4).toString("ascii");
    if (!/^[A-Za-z0-9 ]{4}$/.test(tag)) reject();
    const size = input.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (size > input.length || start + size > input.length) reject();
    const data = Buffer.from(input.subarray(start, start + size));
    offset = start + size + (size % 2);
    if (offset > input.length) reject();
    if (tag === "EXIF" || tag === "XMP ") continue;
    if (tag === "ANIM" || tag === "ANMF") reject();
    chunks.push({ tag, data });
  }
  if (offset !== input.length) reject();
  const extended = chunks.find((chunk) => chunk.tag === "VP8X");
  if (extended) {
    if (extended.data.length !== 10) reject();
    // Little-endian feature byte, same assignment as libwebp WebPFeatureFlags: animation 0x02, XMP 0x04, EXIF 0x08, alpha 0x10, ICC 0x20.
    const animation = 0x02;
    const metadata = 0x04 | 0x08;
    if (extended.data[0] & animation) reject();
    extended.data[0] &= ~metadata;
    checkPixels(1 + extended.data.readUIntLE(4, 3), 1 + extended.data.readUIntLE(7, 3));
  }
  const lossy = chunks.find((chunk) => chunk.tag === "VP8 ");
  const lossless = chunks.find((chunk) => chunk.tag === "VP8L");
  if (!lossy && !lossless) reject();
  if (lossy) {
    if (lossy.data.length < 10 || lossy.data[3] !== 0x9d || lossy.data[4] !== 0x01 || lossy.data[5] !== 0x2a) reject();
    checkPixels(lossy.data.readUInt16LE(6) & 0x3fff, lossy.data.readUInt16LE(8) & 0x3fff);
  }
  if (lossless) {
    if (lossless.data.length < 5 || lossless.data[0] !== 0x2f) reject();
    const bits = lossless.data.readUInt32LE(1);
    checkPixels(1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff));
  }
  const body: Buffer[] = [Buffer.from("WEBP")];
  for (const chunk of chunks) {
    const header = Buffer.alloc(8);
    header.write(chunk.tag, 0, 4, "ascii");
    header.writeUInt32LE(chunk.data.length, 4);
    body.push(header, chunk.data);
    if (chunk.data.length % 2) body.push(Buffer.from([0]));
  }
  const payload = Buffer.concat(body);
  const riff = Buffer.alloc(8);
  riff.write("RIFF", 0, 4, "ascii");
  riff.writeUInt32LE(payload.length, 4);
  return Buffer.concat([riff, payload]);
}
