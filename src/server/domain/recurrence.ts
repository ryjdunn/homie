import { addDays, addMonths, addWeeks } from "date-fns";

export type RecurrenceFrequency = "daily" | "weekly" | "every_n_days" | "monthly";

export type RecurrenceInput = {
  frequency: RecurrenceFrequency;
  interval: number;
  anchorDate: Date;
};

export function calculateNextDueAt(input: RecurrenceInput, from = input.anchorDate) {
  const interval = Math.max(1, input.interval);

  switch (input.frequency) {
    case "daily":
      return addDays(from, interval);
    case "weekly":
      return addWeeks(from, interval);
    case "every_n_days":
      return addDays(from, interval);
    case "monthly":
      return addMonths(from, interval);
  }
}

export function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}
