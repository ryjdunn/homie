import { agentActorFromRequest } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";
import { agentReviewSchema } from "@/server/validation/task-schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const actor = agentActorFromRequest(request);
    const { id } = await params;
    const body = agentReviewSchema.parse(await request.json());
    return getServices().tasks.addAgentReview(id, {
      ...body,
      agentName: actor.agentName,
    });
  });
}
