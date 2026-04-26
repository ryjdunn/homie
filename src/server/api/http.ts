import { AppError } from "@/server/domain/errors";
import type { TaskActor } from "@/server/domain/tasks/task-types";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "validation_error",
          message: error.issues.map((issue) => issue.message).join(", "),
        },
      },
      { status: 422 },
    );
  }

  console.error(error);
  return Response.json(
    {
      ok: false,
      error: {
        code: "internal_error",
        message: "Something went wrong",
      },
    },
    { status: 500 },
  );
}

export async function route<T>(handler: () => Promise<T>) {
  try {
    return jsonOk(await handler());
  } catch (error) {
    return jsonError(error);
  }
}

export function actorFromRequest(request: Request): TaskActor {
  const personId = request.headers.get("x-homie-person-id");
  const agentName = request.headers.get("x-homie-agent-name");

  if (agentName) {
    return { type: "agent", agentName };
  }

  return { type: "human", personId: personId || "person_ryan" };
}
