import { describe, expect, it } from "vitest";
import {
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
    expect(taskFilterSchema.parse({ plannedFor: "2026-04-27" }).plannedFor).toBe("2026-04-27");
    expect(() => taskFilterSchema.parse({ plannedFor: "tomorrow" })).toThrow();
    expect(taskFilterSchema.parse({}).timeSensitive).toBe(false);
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
});
