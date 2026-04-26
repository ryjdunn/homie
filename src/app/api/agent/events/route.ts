import { requireAgentToken } from "@/server/api/agent-auth";
import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";

export async function GET(request: Request) {
  return route(async () => {
    requireAgentToken(request);
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
    return getServices().tasks.listEvents(limit);
  });
}
