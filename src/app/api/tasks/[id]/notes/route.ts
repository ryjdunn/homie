import { getServices } from "@/server/api/context";
import { actorFromRequest, route } from "@/server/api/http";
import { noteSchema } from "@/server/validation/task-schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const { id } = await params;
    const body = noteSchema.parse(await request.json());
    return getServices().tasks.addNote(
      id,
      {
        body: body.body,
        authorType: "human",
        authorPersonId: body.authorPersonId,
        agentName: null,
      },
      actorFromRequest(request),
    );
  });
}
