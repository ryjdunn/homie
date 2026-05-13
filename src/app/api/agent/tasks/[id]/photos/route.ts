import { agentActorFromRequest } from "@/server/api/agent-auth";
import { route } from "@/server/api/http";
import { attachTaskPhotosFromRequest } from "@/server/api/task-photo-upload";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const actor = agentActorFromRequest(request);
    const { id } = await params;
    return attachTaskPhotosFromRequest(id, request, actor);
  });
}
