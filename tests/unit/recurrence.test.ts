import { describe, expect, it } from "vitest";
import { calculateNextDueAt, toDateOnly } from "@/server/domain/recurrence";

describe("recurrence dates", () => {
  it("calculates daily, weekly, every-n-days, and monthly next dates", () => {
    const anchor = new Date("2026-04-26T12:00:00.000Z");

    expect(calculateNextDueAt({ frequency: "daily", interval: 1, anchorDate: anchor }).toISOString()).toBe(
      "2026-04-27T12:00:00.000Z",
    );
    expect(calculateNextDueAt({ frequency: "weekly", interval: 1, anchorDate: anchor }).toISOString()).toBe(
      "2026-05-03T12:00:00.000Z",
    );
    expect(calculateNextDueAt({ frequency: "every_n_days", interval: 4, anchorDate: anchor }).toISOString()).toBe(
      "2026-04-30T12:00:00.000Z",
    );
    expect(calculateNextDueAt({ frequency: "monthly", interval: 1, anchorDate: anchor }).toISOString()).toBe(
      "2026-05-26T12:00:00.000Z",
    );
  });

  it("normalizes date-only values for database recurrence anchors", () => {
    expect(toDateOnly(new Date("2026-04-26T23:59:00.000Z"))).toBe("2026-04-26");
  });
});
