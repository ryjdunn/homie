import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { newId } from "@/server/db/ids";
import { AppError } from "@/server/domain/errors";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const variantConfig = {
  thumb: { maxDimension: 640, quality: 76 },
  large: { maxDimension: 1800, quality: 82 },
} as const;

export type PhotoVariant = "original" | keyof typeof variantConfig;

export type StoredPhoto = {
  fileName: string;
  mimeType: string;
  byteSize: number;
  storageKey: string;
  width: number | null;
  height: number | null;
};

export function uploadRoot() {
  return process.env.HOMIE_UPLOAD_DIR || path.join(tmpdir(), "homie-uploads");
}

export function photoPath(storageKey: string) {
  return path.join(uploadRoot(), storageKey);
}

export async function readPhoto(storageKey: string) {
  return readFile(photoPath(storageKey));
}

export async function readPhotoVariant(storageKey: string, variant: PhotoVariant) {
  if (variant === "original") {
    return readPhoto(storageKey);
  }

  const variantKey = variantStorageKey(storageKey, variant);
  try {
    return await readFile(photoPath(variantKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const bytes = await readPhoto(storageKey);
  await writePhotoVariant(storageKey, variant, bytes);
  return readFile(photoPath(variantKey));
}

export async function storePhotoFile(file: File): Promise<StoredPhoto> {
  if (!allowedMimeTypes.has(file.type)) {
    throw new AppError("Only image uploads are supported", 415, "unsupported_media_type");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    throw new AppError("Photo is empty", 422, "validation_error");
  }

  if (bytes.length > 12 * 1024 * 1024) {
    throw new AppError("Photo must be 12MB or smaller", 413, "payload_too_large");
  }

  await mkdir(uploadRoot(), { recursive: true });
  const storageKey = `${newId("upload")}${extensionFor(file.type)}`;
  await writeFile(photoPath(storageKey), bytes);
  const metadata = await sharp(bytes, { failOn: "none" }).metadata();
  await Promise.allSettled(photoVariants.map((variant) => writePhotoVariant(storageKey, variant, bytes)));

  return {
    fileName: file.name || storageKey,
    mimeType: file.type,
    byteSize: bytes.length,
    storageKey,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}

export function isPhotoVariant(value: string | null): value is PhotoVariant | null {
  return value === null || value === "original" || value === "thumb" || value === "large";
}

export function photoVariantContentType(variant: PhotoVariant, originalMimeType: string) {
  return variant === "original" ? originalMimeType : "image/webp";
}

function variantStorageKey(storageKey: string, variant: keyof typeof variantConfig) {
  const extension = path.extname(storageKey);
  const baseName = extension ? storageKey.slice(0, -extension.length) : storageKey;
  return `${baseName}.${variant}.webp`;
}

async function writePhotoVariant(storageKey: string, variant: keyof typeof variantConfig, bytes: Buffer) {
  const config = variantConfig[variant];
  await sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: config.maxDimension,
      height: config.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: config.quality })
    .toFile(photoPath(variantStorageKey(storageKey, variant)));
}

const photoVariants = Object.keys(variantConfig) as Array<keyof typeof variantConfig>;

function extensionFor(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/heic":
      return ".heic";
    case "image/heif":
      return ".heif";
    default:
      return ".jpg";
  }
}
