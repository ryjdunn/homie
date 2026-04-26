import { requireAgentToken } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    requireAgentToken(request);
    const { id } = await params;
    return getServices().tasks.getTask(id);
  });
}
