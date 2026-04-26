import { describe, expect, it } from "vitest";
import { addDays, addHours } from "date-fns";
import { getUrgencyBand, isTimeSensitive } from "@/server/domain/tasks/urgency";

const now = new Date("2026-04-26T16:00:00.000Z");

function task(overrides: Partial<Parameters<typeof getUrgencyBand>[0]>) {
  return {
    status: "active" as const,
    priority: "normal" as const,
    dueAt: null,
    ...overrides,
  };
}

describe("task urgency", () => {
  it("treats explicit urgent priority as urgent even without a due date", () => {
    expect(getUrgencyBand(task({ priority: "urgent" }), now)).toBe("urgent");
    expect(isTimeSensitive(task({ priority: "urgent" }), now)).toBe(true);
  });

  it("separates overdue, today, soon, and normal tasks", () => {
    expect(getUrgencyBand(task({ dueAt: addHours(now, -1) }), now)).toBe("overdue");
    expect(getUrgencyBand(task({ dueAt: addHours(now, 2) }), now)).toBe("today");
    expect(getUrgencyBand(task({ dueAt: addDays(now, 2) }), now)).toBe("soon");
    expect(getUrgencyBand(task({ dueAt: addDays(now, 7) }), now)).toBe("normal");
  });

  it("keeps completed tasks out of time-sensitive filters", () => {
    const done = task({ status: "done", priority: "urgent", dueAt: addHours(now, -1) });
    expect(getUrgencyBand(done, now)).toBe("done");
    expect(isTimeSensitive(done, now)).toBe(false);
  });
});
