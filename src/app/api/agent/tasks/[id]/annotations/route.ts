import { requireAgentToken } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";
import { annotationSchema } from "@/server/validation/task-schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route(async () => {
    requireAgentToken(request);
    const { id } = await params;
    const body = annotationSchema.parse(await request.json());
    return getServices().tasks.addAgentAnnotation(id, body);
  });
}
