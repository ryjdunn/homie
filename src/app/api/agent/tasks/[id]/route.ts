import { agentActorFromRequest, requireAgentToken } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";
import { updateTaskSchema } from "@/server/validation/task-schemas";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    requireAgentToken(request);
    const { id } = await params;
    return getServices().tasks.getTask(id);
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const actor = agentActorFromRequest(request);
    const { id } = await params;
    const body = updateTaskSchema.parse(await request.json());
    return getServices().tasks.updateTask(id, body, actor);
  });
}
