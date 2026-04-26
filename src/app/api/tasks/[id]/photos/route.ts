import { getServices } from "@/server/api/context";
import { actorFromRequest, route } from "@/server/api/http";
import { storePhotoFile } from "@/server/storage/photo-storage";
import { AppError } from "@/server/domain/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    const formData = await request.formData();
    const files = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File);

    if (!files.length) {
      throw new AppError("Attach at least one photo", 422, "validation_error");
    }

    const photos = [];
    for (const [index, file] of files.entries()) {
      const stored = await storePhotoFile(file);
      photos.push(
        await getServices().tasks.attachPhoto(
          id,
          {
            ...stored,
            width: null,
            height: null,
            caption: "",
            sortOrder: index,
          },
          actorFromRequest(request),
        ),
      );
    }

    return { photos };
  });
}
