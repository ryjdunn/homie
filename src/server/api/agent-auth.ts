import { unauthorized } from "@/server/domain/errors";
import type { TaskActor } from "@/server/domain/tasks/task-types";

export function requireAgentToken(request: Request) {
  const expected = process.env.HOMIE_AGENT_TOKEN;
  if (!expected) {
    return;
  }

  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${expected}`) {
    throw unauthorized("Invalid agent token");
  }
}

export function agentActorFromRequest(request: Request): Extract<TaskActor, { type: "agent" }> {
  requireAgentToken(request);
  const agentName = request.headers.get("x-homie-agent-name")?.trim() || "openclaw";
  return { type: "agent", agentName };
}
