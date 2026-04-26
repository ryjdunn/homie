import { getServices } from "@/server/api/context";
import { actorFromRequest, route } from "@/server/api/http";
import { splitTaskSchema } from "@/server/validation/task-schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    const body = splitTaskSchema.parse(await request.json());
    return getServices().tasks.splitTask(id, body.titles, actorFromRequest(request));
  });
}
