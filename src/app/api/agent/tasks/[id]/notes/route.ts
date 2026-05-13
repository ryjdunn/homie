import { agentActorFromRequest } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";
import { agentNoteSchema } from "@/server/validation/task-schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const actor = agentActorFromRequest(request);
    const { id } = await params;
    const body = agentNoteSchema.parse(await request.json());
    return getServices().tasks.addNote(
      id,
      {
        body: body.body,
        authorType: "agent",
        authorPersonId: null,
        agentName: actor.agentName,
      },
      actor,
    );
  });
}
