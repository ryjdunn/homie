import { getServices } from "@/server/api/context";
import { jsonError } from "@/server/api/http";
import { readPhoto } from "@/server/storage/photo-storage";
import { missingPhotoTheme } from "@/app/theme";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const photo = await getServices().tasks.getPhoto(id);
    let bytes: Buffer;
    try {
      bytes = await readPhoto(photo.storageKey);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return new Response(missingPhotoSvg(photo.fileName), {
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "private, max-age=60",
        },
      });
    }
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    return new Response(body, {
      headers: {
        "content-type": photo.mimeType,
        "cache-control": "private, max-age=3600",
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
