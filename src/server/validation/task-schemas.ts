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

const booleanQueryInput = z
  .string()
  .optional()
  .transform((value) => value === "true" || value === "1");

export const createTaskSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional().default(""),
  priority: taskPrioritySchema.optional().default("normal"),
  dueAt: dateInput.nullish(),
  plannedFor: dateOnlyInput.nullish(),
  categoryId: z.string().min(1).optional().default("cat_house"),
  assigneeId: z.string().min(1).optional().default("person_unassigned"),
  createdById: z.string().min(1).optional().default("person_ryan"),
  sortGroupId: z.string().min(1).nullable().optional(),
  sortGroupName: z.string().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "every_n_days", "monthly"]),
      interval: z.number().int().min(1).max(365).default(1),
      anchorDate: dateInput,
      endDate: dateOnlyInput.nullish(),
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
  sortGroupId: z.string().min(1).nullable().optional(),
  sortGroupName: z.string().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "every_n_days", "monthly"]),
      interval: z.number().int().min(1).max(365).default(1),
      anchorDate: dateInput,
      endDate: dateOnlyInput.nullish(),
    })
    .nullable()
    .optional(),
});

export const taskFilterSchema = z.object({
  status: z.enum(["open", "inbox", "active", "done", "archived"]).optional(),
  assigneeId: z.string().optional(),
  categoryId: z.string().optional(),
  priority: taskPrioritySchema.optional(),
  plannedFor: dateOnlyInput.optional(),
  timeSensitive: booleanQueryInput,
  needsReview: booleanQueryInput,
});

export const noteSchema = z.object({
  body: z.string().min(1).max(4000),
  authorPersonId: z.string().optional().default("person_ryan"),
});

export const agentNoteSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const annotationSchema = z.object({
  agentName: z.string().min(1).max(120),
  kind: z.string().min(1).max(80),
  body: z.string().min(1).max(4000),
  data: z.record(z.string(), z.unknown()).optional().default({}),
});

export const agentAnnotationSchema = annotationSchema
  .omit({ agentName: true })
  .extend({
    agentName: z.string().min(1).max(120).optional(),
  });

export const agentReviewHelpKindSchema = z.enum([
  "return",
  "sell_or_donate",
  "research",
  "schedule",
  "reminder",
  "attach_artifact",
  "not_actionable",
  "other",
]);

export const agentReviewNextActionSchema = z.enum([
  "none",
  "ask_user",
  "research",
  "attach_artifact",
  "schedule",
  "external_action_pending_approval",
]);

export const agentReviewSchema = z.object({
  body: z.string().min(1).max(4000).optional().default("OpenClaw reviewed this task."),
  canHelp: z.boolean().optional(),
  helpKinds: z.array(agentReviewHelpKindSchema).max(12).optional().default([]),
  nextAction: agentReviewNextActionSchema.optional().default("none"),
  confidence: z.number().min(0).max(1).optional(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
});
