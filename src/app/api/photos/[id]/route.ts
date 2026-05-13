import { getServices } from "@/server/api/context";
import { jsonError } from "@/server/api/http";
import { isPhotoVariant, photoVariantContentType, readPhoto, readPhotoVariant } from "@/server/storage/photo-storage";
import { missingPhotoTheme } from "@/app/theme";
import { AppError } from "@/server/domain/errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const requestedVariant = new URL(request.url).searchParams.get("variant");
    if (!isPhotoVariant(requestedVariant)) {
      return jsonError(new AppError("Unsupported photo variant", 400, "validation_error"));
    }
    const variant = requestedVariant ?? "original";
    const photo = await getServices().tasks.getPhoto(id);
    let bytes: Buffer;
    let contentType = photoVariantContentType(variant, photo.mimeType);
    try {
      bytes = await readPhotoVariant(photo.storageKey, variant);
    } catch (error) {
      if (variant !== "original" && (error as NodeJS.ErrnoException).code !== "ENOENT") {
        bytes = await readPhoto(photo.storageKey);
        contentType = photo.mimeType;
      } else {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        return new Response(missingPhotoSvg(photo.fileName), {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "private, max-age=60",
          },
        });
      }
    }
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    return new Response(body, {
      headers: {
        "content-type": contentType,
        "cache-control": variant === "original" ? "private, max-age=3600" : "private, max-age=86400",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

function missingPhotoSvg(fileName: string) {
  const safeName = escapeXml(fileName);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="Photo unavailable">
  <rect width="320" height="320" rx="28" fill="${missingPhotoTheme.background}"/>
  <path d="M82 218h156l-42-54-34 42-24-30-56 42Z" fill="${missingPhotoTheme.illustration}"/>
  <circle cx="108" cy="112" r="24" fill="${missingPhotoTheme.accent}" opacity=".35"/>
  <text x="160" y="252" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="20" font-weight="700" fill="${missingPhotoTheme.text}">Photo unavailable</text>
  <text x="160" y="278" text-anchor="middle" font-family="Avenir Next, Arial, sans-serif" font-size="14" fill="${missingPhotoTheme.text}">${safeName}</text>
</svg>`;
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
