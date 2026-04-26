import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const taskStatusSchema = z.enum(["inbox", "active", "done", "archived"]);

const dateInput = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return date;
  });

const dateOnlyInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  }, "Invalid date");

export const createTaskSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional().default(""),
  priority: taskPrioritySchema.optional().default("normal"),
  dueAt: dateInput.nullish(),
  plannedFor: dateOnlyInput.nullish(),
  categoryId: z.string().min(1).optional().default("cat_house"),
  assigneeId: z.string().min(1).optional().default("person_unassigned"),
  createdById: z.string().min(1).optional().default("person_ryan"),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "every_n_days", "monthly"]),
      interval: z.number().int().min(1).max(365).default(1),
      anchorDate: dateInput,
    })
    .optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(4000).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: dateInput.nullable().optional(),
  plannedFor: dateOnlyInput.nullable().optional(),
  categoryId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
});

export const taskFilterSchema = z.object({
  status: z.enum(["open", "inbox", "active", "done", "archived"]).optional(),
  assigneeId: z.string().optional(),
  categoryId: z.string().optional(),
  priority: taskPrioritySchema.optional(),
  plannedFor: dateOnlyInput.optional(),
  timeSensitive: z
    .string()
    .optional()
    .transform((value) => value === "true" || value === "1"),
});

export const noteSchema = z.object({
  body: z.string().min(1).max(4000),
  authorPersonId: z.string().optional().default("person_ryan"),
});

export const splitTaskSchema = z.object({
  titles: z.array(z.string().min(1).max(160)).min(2).max(20),
});

export const annotationSchema = z.object({
  agentName: z.string().min(1).max(120),
  kind: z.string().min(1).max(80),
  body: z.string().min(1).max(4000),
  data: z.record(z.string(), z.unknown()).optional().default({}),
});
