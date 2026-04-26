import { addDays, endOfDay, isBefore, isEqual } from "date-fns";
import type { Task } from "@/server/db/schema";

export type UrgencyBand = "overdue" | "today" | "soon" | "urgent" | "normal" | "done";

export function getUrgencyBand(task: Pick<Task, "status" | "priority" | "dueAt">, now = new Date()): UrgencyBand {
  if (task.status === "done" || task.status === "archived") {
    return "done";
  }

  if (task.priority === "urgent") {
    return "urgent";
  }

  if (!task.dueAt) {
    return task.priority === "high" ? "soon" : "normal";
  }

  const todayEnd = endOfDay(now);
  const soonEnd = endOfDay(addDays(now, 3));

  if (isBefore(task.dueAt, now)) {
    return "overdue";
  }

  if (isBefore(task.dueAt, todayEnd) || isEqual(task.dueAt, todayEnd)) {
    return "today";
  }

  if (task.priority === "high" || isBefore(task.dueAt, soonEnd) || isEqual(task.dueAt, soonEnd)) {
    return "soon";
  }

  return "normal";
}

export function isTimeSensitive(task: Pick<Task, "status" | "priority" | "dueAt">, now = new Date()) {
  return ["overdue", "today", "soon", "urgent"].includes(getUrgencyBand(task, now));
}
