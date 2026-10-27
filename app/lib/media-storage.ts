import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const FORMATS = [
  { ext: "png", mime: "image/png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  { ext: "jpg", mime: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  { ext: "webp", mime: "image/webp", magic: [[0x52, 0x49, 0x46, 0x46]] },
  { ext: "gif", mime: "image/gif", magic: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]] },
] as const;

export function uploadsDir() {
  return process.env.MEDIA_DIR || join(process.cwd(), "data", "uploads");
}

export function mediaFileNamePattern() {
  return /^[a-f0-9]{64}\.(png|jpg|webp|gif)$/;
}

export function mediaMime(name: string) {
  return FORMATS.find((format) => format.ext === name.split(".")[1])?.mime ?? "application/octet-stream";
}

type StoredImage = { url: string } | { error: string };

/**
 * Validates an uploaded image by magic bytes, stores it under its sha256 name,
 * and returns the public /api/media URL for the markdown body.
 */
export async function saveUploadedImage(file: File): Promise<StoredImage> {
  if (file.size === 0) return { error: "Choose an image file to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Images must be 2 MB or smaller." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = FORMATS.find((candidate) => candidate.magic.some((prefix) => prefix.every((byte, index) => bytes[index] === byte)));
  if (!format) return { error: "Only PNG, JPEG, WebP, and GIF images are supported." };

  const hash = createHash("sha256").update(bytes).digest("hex");
  const name = `${hash}.${format.ext}`;
  const path = join(uploadsDir(), name);
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(path, bytes);
  return { url: `/api/media/${name}` };
}
