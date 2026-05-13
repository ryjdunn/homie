import { getServices } from "@/server/api/context";
import { AppError } from "@/server/domain/errors";
import type { TaskActor } from "@/server/domain/tasks/task-types";
import { storePhotoFile } from "@/server/storage/photo-storage";

export async function attachTaskPhotosFromRequest(taskId: string, request: Request, actor: TaskActor) {
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
        taskId,
        {
          ...stored,
          caption: "",
          sortOrder: index,
        },
        actor,
      ),
    );
  }

  return { photos };
}
