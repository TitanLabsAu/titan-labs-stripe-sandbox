import { z } from "zod";
import { imageSize } from "image-size";

export const REVIEW_PHOTO_LIMIT = 5;
export const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const photoIdsSchema = z.array(z.string().uuid()).max(REVIEW_PHOTO_LIMIT).refine(ids => new Set(ids).size === ids.length, "Duplicate photo");
export const photoUploadSchema = z.object({ mime: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(1).max(Math.ceil(REVIEW_PHOTO_MAX_BYTES / 3) * 4) });
export function validatePhotoBytes(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > REVIEW_PHOTO_MAX_BYTES) throw new Error("Each photo must be no larger than 5 MB");
  let size;
  try { size = imageSize(bytes); } catch { throw new Error("Choose a valid JPG, PNG or WebP image"); }
  const expected: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  if (size.type !== expected[mime] || !size.width || !size.height || size.width * size.height > 40_000_000) throw new Error("Choose a valid JPG, PNG or WebP image under 40 megapixels");
  return { mime, extension: mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp" };
}
export function validateSelectedPhotos(files: Pick<File, "type" | "size">[], existing = 0) {
  if (files.length + existing > REVIEW_PHOTO_LIMIT) throw new Error("Attach up to 5 photos");
  for (const f of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) throw new Error("Choose JPG, PNG or WebP photos");
    if (!f.size || f.size > REVIEW_PHOTO_MAX_BYTES) throw new Error("Each photo must be no larger than 5 MB");
  }
}
export type ReviewPhoto = { id: string; url: string };