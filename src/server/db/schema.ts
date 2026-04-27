import { relations } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const personKindEnum = pgEnum("person_kind", ["human", "system"]);
export const taskStatusEnum = pgEnum("task_status", [
  "inbox",
  "active",
  "done",
  "archived",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const actorTypeEnum = pgEnum("actor_type", ["human", "agent", "system"]);
export const taskEventTypeEnum = pgEnum("task_event_type", [
  "created",
  "updated",
  "completed",
  "reopened",
  "note_added",
  "photo_added",
  "annotation_added",
  "recurrence_scheduled",
]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "daily",
  "weekly",
  "every_n_days",
  "monthly",
]);

export const people = pgTable(
  "people",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: personKindEnum("kind").notNull().default("human"),
    initials: text("initials").notNull(),
    color: text("color").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("people_slug_idx").on(table.slug)],
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: taskStatusEnum("status").notNull().default("inbox"),
    priority: taskPriorityEnum("priority").notNull().default("normal"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    plannedFor: date("planned_for"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    assigneeId: text("assignee_id").references(() => people.id, {
      onDelete: "set null",
    }),
    createdById: text("created_by_id").references(() => people.id, {
      onDelete: "set null",
    }),
    completedById: text("completed_by_id").references(() => people.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    parentTaskId: text("parent_task_id").references(
      (): AnyPgColumn => tasks.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_status_idx").on(table.status),
    index("tasks_due_at_idx").on(table.dueAt),
    index("tasks_planned_for_idx").on(table.plannedFor),
    index("tasks_priority_idx").on(table.priority),
    index("tasks_category_idx").on(table.categoryId),
    index("tasks_assignee_idx").on(table.assigneeId),
    index("tasks_parent_idx").on(table.parentTaskId),
  ],
);

export const taskPhotos = pgTable(
  "task_photos",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    storageKey: text("storage_key").notNull(),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("task_photos_task_idx").on(table.taskId),
    uniqueIndex("task_photos_storage_key_idx").on(table.storageKey),
  ],
);

export const taskNotes = pgTable(
  "task_notes",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorType: actorTypeEnum("author_type").notNull(),
    authorPersonId: text("author_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    agentName: text("agent_name"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("task_notes_task_idx").on(table.taskId)],
);

export const taskEvents = pgTable(
  "task_events",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorPersonId: text("actor_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    agentName: text("agent_name"),
    eventType: taskEventTypeEnum("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("task_events_task_idx").on(table.taskId),
    index("task_events_created_at_idx").on(table.createdAt),
    index("task_events_type_idx").on(table.eventType),
  ],
);

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    frequency: recurrenceFrequencyEnum("frequency").notNull(),
    interval: integer("interval").notNull().default(1),
    anchorDate: date("anchor_date").notNull(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
    endDate: date("end_date"),
    lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("recurring_rules_task_idx").on(table.taskId),
    index("recurring_rules_next_due_idx").on(table.nextDueAt),
  ],
);

export const agentAnnotations = pgTable(
  "agent_annotations",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    agentName: text("agent_name").notNull(),
    kind: text("kind").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("agent_annotations_task_idx").on(table.taskId),
    index("agent_annotations_agent_idx").on(table.agentName),
  ],
);

export const peopleRelations = relations(people, ({ many }) => ({
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "creator" }),
  notes: many(taskNotes),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  category: one(categories, {
    fields: [tasks.categoryId],
    references: [categories.id],
  }),
  assignee: one(people, {
    fields: [tasks.assigneeId],
    references: [people.id],
    relationName: "assignee",
  }),
  createdBy: one(people, {
    fields: [tasks.createdById],
    references: [people.id],
    relationName: "creator",
  }),
  completedBy: one(people, {
    fields: [tasks.completedById],
    references: [people.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "task_parent",
  }),
  childTasks: many(tasks, { relationName: "task_parent" }),
  photos: many(taskPhotos),
  notes: many(taskNotes),
  events: many(taskEvents),
  recurringRule: one(recurringRules),
  annotations: many(agentAnnotations),
}));

export type Person = InferSelectModel<typeof people>;
export type NewPerson = InferInsertModel<typeof people>;
export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;
export type TaskPhoto = InferSelectModel<typeof taskPhotos>;
export type NewTaskPhoto = InferInsertModel<typeof taskPhotos>;
export type TaskNote = InferSelectModel<typeof taskNotes>;
export type NewTaskNote = InferInsertModel<typeof taskNotes>;
export type TaskEvent = InferSelectModel<typeof taskEvents>;
export type NewTaskEvent = InferInsertModel<typeof taskEvents>;
export type RecurringRule = InferSelectModel<typeof recurringRules>;
export type NewRecurringRule = InferInsertModel<typeof recurringRules>;
export type AgentAnnotation = InferSelectModel<typeof agentAnnotations>;
export type NewAgentAnnotation = InferInsertModel<typeof agentAnnotations>;
