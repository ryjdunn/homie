import { unauthorized } from "@/server/domain/errors";

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
