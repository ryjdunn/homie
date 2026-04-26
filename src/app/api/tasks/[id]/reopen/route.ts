import { getServices } from "@/server/api/context";
import { actorFromRequest, route } from "@/server/api/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    return getServices().tasks.reopenTask(id, actorFromRequest(request));
  });
}
