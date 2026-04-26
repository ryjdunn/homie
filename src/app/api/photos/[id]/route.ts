import { getServices } from "@/server/api/context";
import { jsonError } from "@/server/api/http";
import { readPhoto } from "@/server/storage/photo-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const photo = await getServices().tasks.getPhoto(id);
    const bytes = await readPhoto(photo.storageKey);
    return new Response(bytes, {
      headers: {
        "content-type": photo.mimeType,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
