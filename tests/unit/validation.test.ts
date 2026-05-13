import { describe, expect, it } from "vitest";
import {
  agentAnnotationSchema,
  agentNoteSchema,
  agentReviewSchema,
  annotationSchema,
  createTaskSchema,
  taskFilterSchema,
  updateTaskSchema,
} from "@/server/validation/task-schemas";

describe("API validation schemas", () => {
  it("normalizes task creation defaults", () => {
    const parsed = createTaskSchema.parse({ title: "Wash towels" });
    expect(parsed.description).toBe("");
    expect(parsed.priority).toBe("normal");
    expect(parsed.categoryId).toBe("cat_house");
    expect(parsed.assigneeId).toBe("person_unassigned");
  });

  it("parses dates and rejects invalid date strings", () => {
    const parsed = createTaskSchema.parse({
      title: "Take bins out",
      dueAt: "2026-04-26T18:00:00.000Z",
      plannedFor: "2026-04-27",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        anchorDate: "2026-04-26T18:00:00.000Z",
      },
    });
    expect(parsed.dueAt).toBeInstanceOf(Date);
    expect(parsed.plannedFor).toBe("2026-04-27");
    expect(parsed.recurrence?.anchorDate).toBeInstanceOf(Date);
    expect(() => updateTaskSchema.parse({ dueAt: "not-a-date" })).toThrow();
    expect(() => updateTaskSchema.parse({ plannedFor: "2026-02-31" })).toThrow();
    expect(updateTaskSchema.parse({ plannedFor: null }).plannedFor).toBeNull();
  });

  it("normalizes time-sensitive query values", () => {
    expect(taskFilterSchema.parse({ timeSensitive: "true" }).timeSensitive).toBe(true);
    expect(taskFilterSchema.parse({ timeSensitive: "1" }).timeSensitive).toBe(true);
    expect(taskFilterSchema.parse({ needsReview: "true" }).needsReview).toBe(true);
    expect(taskFilterSchema.parse({ plannedFor: "2026-04-27" }).plannedFor).toBe("2026-04-27");
    expect(() => taskFilterSchema.parse({ plannedFor: "tomorrow" })).toThrow();
    expect(taskFilterSchema.parse({}).timeSensitive).toBe(false);
    expect(taskFilterSchema.parse({}).needsReview).toBe(false);
  });

  it("accepts structured agent annotation payloads", () => {
    const parsed = annotationSchema.parse({
      agentName: "openclaw",
      kind: "categorization",
      body: "Looks like a dump run.",
      data: { confidence: 0.9 },
    });
    expect(parsed.data.confidence).toBe(0.9);
  });

  it("accepts agent-owned note and annotation payloads", () => {
    expect(agentNoteSchema.parse({ body: "Drafted return instructions." }).body).toBe("Drafted return instructions.");
    const parsed = agentAnnotationSchema.parse({
      kind: "review",
      body: "Looked at the task and found no blocker.",
      data: { source: "discord-request" },
    });
    expect(parsed.agentName).toBeUndefined();
    expect(parsed.data.source).toBe("discord-request");
  });

  it("accepts the small OpenClaw review contract", () => {
    const parsed = agentReviewSchema.parse({
      body: "Can help with a return lookup.",
      canHelp: true,
      helpKinds: ["return", "research"],
      nextAction: "ask_user",
      confidence: 0.84,
    });
    expect(parsed.helpKinds).toEqual(["return", "research"]);
    expect(parsed.nextAction).toBe("ask_user");
    expect(agentReviewSchema.parse({}).body).toBe("OpenClaw reviewed this task.");
  });
});
