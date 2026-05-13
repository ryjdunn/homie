import { agentActorFromRequest, requireAgentToken } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";
import { createTaskSchema, taskFilterSchema } from "@/server/validation/task-schemas";

export async function GET(request: Request) {
  return route(async () => {
    requireAgentToken(request);
    const url = new URL(request.url);
    const filters = taskFilterSchema.parse(Object.fromEntries(url.searchParams.entries()));
    return getServices().tasks.listTasks(filters);
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const actor = agentActorFromRequest(request);
    const body = createTaskSchema.parse(await request.json());
    return getServices().tasks.createTask(body, actor);
  });
}
