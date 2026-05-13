import { agentActorFromRequest } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const actor = agentActorFromRequest(request);
    const { id } = await params;
    return getServices().tasks.completeTask(id, actor);
  });
}
