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
  needsReview?: boolean;
  includeArchived?: boolean;
};

export type TaskActor =
  | { type: "human"; personId: string | null }
  | { type: "agent"; agentName: string }
  | { type: "system" };

export type CreateTaskInput = Pick<
  NewTask,
  | "title"
  | "description"
  | "priority"
  | "dueAt"
  | "plannedFor"
  | "categoryId"
  | "assigneeId"
  | "createdById"
  | "sortGroupId"
  | "sortGroupName"
  | "sortOrder"
> & {
  recurrence?: {
    frequency: NewRecurringRule["frequency"];
    interval: number;
    anchorDate: Date;
    endDate?: string | null;
  };
};

export type UpdateTaskInput = Partial<
  Pick<
    NewTask,
    "title" | "description" | "status" | "priority" | "dueAt" | "plannedFor" | "categoryId" | "assigneeId" | "sortGroupId" | "sortGroupName" | "sortOrder"
  >
> & {
  recurrence?:
    | {
        frequency: NewRecurringRule["frequency"];
        interval: number;
        anchorDate: Date;
        endDate?: string | null;
      }
    | null;
};

export type AddNoteInput = Pick<NewTaskNote, "body" | "authorType" | "authorPersonId" | "agentName">;

export type AttachPhotoInput = Pick<
  NewTaskPhoto,
  "fileName" | "mimeType" | "byteSize" | "storageKey" | "width" | "height" | "caption" | "sortOrder"
>;

export type AddAgentReviewInput = {
  agentName: string;
  body: string;
  canHelp?: boolean;
  helpKinds?: string[];
  nextAction?: string;
  confidence?: number;
  data?: Record<string, unknown>;
};

export type TaskAgentReview = {
  isFresh: boolean;
  agentName: string | null;
  reviewedAt: Date | null;
};

export type TaskWithContext = Task & {
  assignee: Person | null;
  createdBy: Person | null;
  category: Category;
  photos: TaskPhoto[];
  notes: TaskNote[];
  recurringRule: RecurringRule | null;
  annotations: AgentAnnotation[];
  agentReview: TaskAgentReview;
  urgency: UrgencyBand;
};

export type SortBoardGroup = {
  id: string;
  name: string;
  order: number;
  taskCount: number;
  tasks: TaskWithContext[];
};

export type SortBoard = {
  view: "sort";
  summary: {
    taskCount: number;
    groupCount: number;
    looseCount: number;
  };
  groups: SortBoardGroup[];
  loose: {
    id: "loose";
    name: "Loose tiles";
    order: null;
    taskCount: number;
    tasks: TaskWithContext[];
  };
};

export type NewEventInput = Omit<NewTaskEvent, "id" | "createdAt">;
