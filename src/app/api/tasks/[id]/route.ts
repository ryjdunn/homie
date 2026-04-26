import { getServices } from "@/server/api/context";
import { actorFromRequest, route } from "@/server/api/http";
import { updateTaskSchema } from "@/server/validation/task-schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    return getServices().tasks.getTask(id);
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    const body = updateTaskSchema.parse(await request.json());
    return getServices().tasks.updateTask(id, body, actorFromRequest(request));
  });
}
