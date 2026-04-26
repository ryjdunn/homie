import type {
  AgentAnnotation,
  Category,
  NewRecurringRule,
  NewTask,
  NewTaskEvent,
  NewTaskNote,
  NewTaskPhoto,
  Person,
  RecurringRule,
  Task,
  TaskNote,
  TaskPhoto,
} from "@/server/db/schema";
import type { UrgencyBand } from "@/server/domain/tasks/urgency";

export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];

export type TaskFilters = {
  status?: TaskStatus | "open";
  assigneeId?: string;
  categoryId?: string;
  priority?: TaskPriority;
  plannedFor?: string;
  timeSensitive?: boolean;
  includeArchived?: boolean;
};

export type TaskActor =
  | { type: "human"; personId: string | null }
  | { type: "agent"; agentName: string }
  | { type: "system" };

export type CreateTaskInput = Pick<
  NewTask,
  "title" | "description" | "priority" | "dueAt" | "plannedFor" | "categoryId" | "assigneeId" | "createdById"
> & {
  recurrence?: {
    frequency: NewRecurringRule["frequency"];
    interval: number;
    anchorDate: Date;
  };
};

export type UpdateTaskInput = Partial<
  Pick<NewTask, "title" | "description" | "status" | "priority" | "dueAt" | "plannedFor" | "categoryId" | "assigneeId">
>;

export type AddNoteInput = Pick<NewTaskNote, "body" | "authorType" | "authorPersonId" | "agentName">;

export type AttachPhotoInput = Pick<
  NewTaskPhoto,
  "fileName" | "mimeType" | "byteSize" | "storageKey" | "width" | "height" | "caption" | "sortOrder"
>;

export type TaskWithContext = Task & {
  assignee: Person | null;
  category: Category;
  photos: TaskPhoto[];
  notes: TaskNote[];
  recurringRule: RecurringRule | null;
  annotations: AgentAnnotation[];
  urgency: UrgencyBand;
};

export type NewEventInput = Omit<NewTaskEvent, "id" | "createdAt">;
