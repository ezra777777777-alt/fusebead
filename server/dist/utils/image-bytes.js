"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageRejected = exports.MAX_PIXELS = exports.MAX_ATTACHMENTS = exports.MAX_IMAGE_BYTES = void 0;
exports.sanitizeImage = sanitizeImage;
const zlib_1 = require("zlib");
exports.MAX_IMAGE_BYTES = 2 * 1024 * 1024;
exports.MAX_ATTACHMENTS = 8;
exports.MAX_PIXELS = 12000000;
class ImageRejected extends Error {
}
exports.ImageRejected = ImageRejected;
const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "sRGB", "cHRM", "bKGD", "pHYs", "sBIT"]);
function sanitizeImage(input) {
    if (!Buffer.isBuffer(input) || input.length < 12)
        throw new ImageRejected("请上传 PNG、JPEG 或 WebP 图片");
    if (input.length > exports.MAX_IMAGE_BYTES)
        throw new ImageRejected("单张图片不能超过 2 MB");
    if (isPng(input))
        return { bytes: sanitizePng(input), mime: "image/png", extension: "png" };
    if (isJpeg(input))
        return { bytes: sanitizeJpeg(input), mime: "image/jpeg", extension: "jpg" };
    if (isWebp(input))
        return { bytes: sanitizeWebp(input), mime: "image/webp", extension: "webp" };
    throw new ImageRejected("请上传 PNG、JPEG 或 WebP 图片");
}
function isPng(input) {
    return input.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}
function isJpeg(input) {
    return input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
}
function isWebp(input) {
    return input.subarray(0, 4).toString("ascii") === "RIFF" && input.subarray(8, 12).toString("ascii") === "WEBP";
}
function reject(message = "请上传 PNG、JPEG 或 WebP 图片") {
    throw new ImageRejected(message);
}
function checkPixels(width, height) {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
        reject();
    if (width > exports.MAX_PIXELS || height > exports.MAX_PIXELS || width * height > exports.MAX_PIXELS)
        reject("图片尺寸超过 1200 万像素");
}
function crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let bit = 0; bit < 8; bit++)
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function sanitizePng(input) {
    const signature = input.subarray(0, 8);
    const kept = [signature];
    let offset = 8;
    let sawHeader = false;
    let sawData = false;
    let sawEnd = false;
    const idat = [];
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlace = 0;
    while (offset + 12 <= input.length) {
        const length = input.readUInt32BE(offset);
        if (length > input.length || offset + 12 + length > input.length)
            reject();
        const type = input.subarray(offset + 4, offset + 8).toString("ascii");
        if (!/^[A-Za-z]{4}$/.test(type))
            reject();
        const typeAndData = input.subarray(offset + 4, offset + 8 + length);
        const expected = input.readUInt32BE(offset + 8 + length);
        if (crc32(typeAndData) !== expected)
            reject();
        const data = input.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;
        if (sawEnd)
            reject();
        if (!sawHeader && type !== "IHDR")
            reject();
        if (type === "IHDR") {
            if (sawHeader || data.length !== 13)
                reject();
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
            interlace = data[12];
            checkPixels(width, height);
            if (![1, 2, 4, 8, 16].includes(bitDepth) || ![0, 2, 3, 4, 6].includes(colorType) || data[10] !== 0 || data[11] !== 0 || interlace > 1)
                reject();
            sawHeader = true;
        }
        if (type === "IDAT") {
            sawData = true;
            idat.push(Buffer.from(data));
        }
        if (type === "IEND") {
            if (length !== 0 || !sawData)
                reject();
            sawEnd = true;
        }
        if (PNG_KEEP.has(type))
            kept.push(input.subarray(offset - (12 + length), offset));
    }
    if (!sawEnd || offset !== input.length)
        reject();
    const samples = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType] || 0;
    if (!samples)
        reject();
    const expectedBytes = height * (1 + Math.ceil((width * bitDepth * samples) / 8));
    let inflated;
    try {
        inflated = (0, zlib_1.inflateSync)(Buffer.concat(idat), { maxOutputLength: expectedBytes });
    }
    catch {
        reject();
    }
    if (interlace === 0 && inflated.length !== expectedBytes)
        reject();
    return Buffer.concat(kept);
}
function sanitizeJpeg(input) {
    const out = [Buffer.from([0xff, 0xd8])];
    let offset = 2;
    let sawFrame = false;
    const strip = new Set([0xe1, 0xe2, 0xed, 0xfe]);
    while (offset < input.length) {
        if (input[offset] !== 0xff)
            reject();
        while (offset < input.length - 1 && input[offset] === 0xff && input[offset + 1] === 0xff)
            offset++;
        if (offset + 1 >= input.length)
            reject();
        const marker = input[offset + 1];
        if (marker === 0xd8 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7))
            reject();
        if (marker === 0xd9)
            reject();
        if (marker === 0xda) {
            if (!sawFrame || offset + 4 > input.length)
                reject();
            const length = input.readUInt16BE(offset + 2);
            if (length < 8 || offset + 2 + length > input.length)
                reject();
            const scan = offset + 2 + length;
            let cursor = scan;
            while (cursor < input.length) {
                if (input[cursor] !== 0xff) {
                    cursor++;
                    continue;
                }
                if (cursor + 1 >= input.length)
                    reject();
                const next = input[cursor + 1];
                if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
                    cursor += 2;
                    continue;
                }
                if (next === 0xd9) {
                    if (cursor + 2 !== input.length)
                        reject();
                    out.push(input.subarray(offset, cursor + 2));
                    return Buffer.concat(out);
                }
                reject();
            }
            reject();
        }
        if (offset + 4 > input.length)
            reject();
        const length = input.readUInt16BE(offset + 2);
        if (length < 2 || offset + 2 + length > input.length)
            reject();
        const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isFrame) {
            if (length < 8)
                reject();
            checkPixels(input.readUInt16BE(offset + 7), input.readUInt16BE(offset + 5));
            sawFrame = true;
        }
        if (!strip.has(marker))
            out.push(input.subarray(offset, offset + 2 + length));
        offset += 2 + length;
    }
    reject();
}
function sanitizeWebp(input) {
    if (input.readUInt32LE(4) !== input.length - 8)
        reject();
    const chunks = [];
    let offset = 12;
    while (offset < input.length) {
        if (offset + 8 > input.length)
            reject();
        const tag = input.subarray(offset, offset + 4).toString("ascii");
        if (!/^[A-Za-z0-9 ]{4}$/.test(tag))
            reject();
        const size = input.readUInt32LE(offset + 4);
        const start = offset + 8;
        if (size > input.length || start + size > input.length)
            reject();
        const data = Buffer.from(input.subarray(start, start + size));
        offset = start + size + (size % 2);
        if (offset > input.length)
            reject();
        if (tag === "EXIF" || tag === "XMP ")
            continue;
        if (tag === "ANIM" || tag === "ANMF")
            reject();
        chunks.push({ tag, data });
    }
    if (offset !== input.length)
        reject();
    const extended = chunks.find((chunk) => chunk.tag === "VP8X");
    if (extended) {
        if (extended.data.length !== 10)
            reject();
        if (extended.data[0] & 0x20)
            reject();
        extended.data[0] &= ~0x18;
        checkPixels(1 + extended.data.readUIntLE(4, 3), 1 + extended.data.readUIntLE(7, 3));
    }
    const lossy = chunks.find((chunk) => chunk.tag === "VP8 ");
    const lossless = chunks.find((chunk) => chunk.tag === "VP8L");
    if (!lossy && !lossless)
        reject();
    if (lossy) {
        if (lossy.data.length < 10 || lossy.data[3] !== 0x9d || lossy.data[4] !== 0x01 || lossy.data[5] !== 0x2a)
            reject();
        checkPixels(lossy.data.readUInt16LE(6) & 0x3fff, lossy.data.readUInt16LE(8) & 0x3fff);
    }
    if (lossless) {
        if (lossless.data.length < 5 || lossless.data[0] !== 0x2f)
            reject();
        const bits = lossless.data.readUInt32LE(1);
        checkPixels(1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff));
    }
    const body = [Buffer.from("WEBP")];
    for (const chunk of chunks) {
        const header = Buffer.alloc(8);
        header.write(chunk.tag, 0, 4, "ascii");
        header.writeUInt32LE(chunk.data.length, 4);
        body.push(header, chunk.data);
        if (chunk.data.length % 2)
            body.push(Buffer.from([0]));
    }
    const payload = Buffer.concat(body);
    const riff = Buffer.alloc(8);
    riff.write("RIFF", 0, 4, "ascii");
    riff.writeUInt32LE(payload.length, 4);
    return Buffer.concat([riff, payload]);
}
