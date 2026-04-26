import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { newId } from "@/server/db/ids";
import { AppError } from "@/server/domain/errors";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export type StoredPhoto = {
  fileName: string;
  mimeType: string;
  byteSize: number;
  storageKey: string;
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

  return {
    fileName: file.name || storageKey,
    mimeType: file.type,
    byteSize: bytes.length,
    storageKey,
  };
}

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
