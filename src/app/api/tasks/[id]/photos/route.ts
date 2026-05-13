import { actorFromRequest, route } from "@/server/api/http";
import { attachTaskPhotosFromRequest } from "@/server/api/task-photo-upload";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    return attachTaskPhotosFromRequest(id, request, actorFromRequest(request));
  });
}
