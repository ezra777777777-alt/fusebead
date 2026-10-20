export declare const MAX_IMAGE_BYTES: number;
export declare const MAX_ATTACHMENTS = 8;
export declare const MAX_PIXELS = 12000000;
export declare class ImageRejected extends Error {
}
export type SanitizedImage = {
    bytes: Buffer;
    mime: "image/jpeg" | "image/png" | "image/webp";
    extension: "jpg" | "png" | "webp";
};
export declare function sanitizeImage(input: Buffer): SanitizedImage;
