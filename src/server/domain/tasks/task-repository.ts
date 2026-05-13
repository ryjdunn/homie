import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DbConnection } from "@/server/db/client";
import { newId } from "@/server/db/ids";
import {
  agentAnnotations,
  categories,
  people,
  recurringRules,
  taskEvents,
  taskNotes,
  taskPhotos,
  tasks,
  type AgentAnnotation,
  type Category,
  type NewAgentAnnotation,
  type NewRecurringRule,
  type NewTask,
  type NewTaskEvent,
  type NewTaskNote,
  type Person,
  type RecurringRule,
  type Task,
  type TaskEvent,
  type TaskNote,
  type TaskPhoto,
} from "@/server/db/schema";
import type { AttachPhotoInput, TaskFilters, UpdateTaskInput } from "@/server/domain/tasks/task-types";

export class TaskRepository {
  constructor(private readonly conn: DbConnection) {}

  async listTasks(filters: TaskFilters = {}): Promise<Task[]> {
    const conditions: SQL[] = [];

    if (!filters.includeArchived) {
      conditions.push(ne(tasks.status, "archived"));
    }

    if (filters.status === "open") {
      conditions.push(ne(tasks.status, "done"));
      conditions.push(ne(tasks.status, "archived"));
    } else if (filters.status) {
      conditions.push(eq(tasks.status, filters.status));
    }

    if (filters.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    if (filters.categoryId) {
      conditions.push(eq(tasks.categoryId, filters.categoryId));
    }

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    if (filters.plannedFor) {
      conditions.push(eq(tasks.plannedFor, filters.plannedFor));
    }

    return this.conn.db
      .select()
      .from(tasks)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(tasks.status), asc(tasks.sortGroupId), asc(tasks.sortOrder), asc(tasks.plannedFor), asc(tasks.dueAt), desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await this.conn.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return task;
  }

  async createTask(input: Omit<NewTask, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Task> {
    const [task] = await this.conn.db
      .insert(tasks)
      .values({
        id: input.id ?? newId("task"),
        ...input,
        updatedAt: new Date(),
      })
      .returning();
    return task;
  }

  async updateTask(id: string, input: UpdateTaskInput & { completedAt?: Date | null; completedById?: string | null }) {
    const [task] = await this.conn.db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async touchTask(id: string): Promise<Task | undefined> {
    const [task] = await this.conn.db
      .update(tasks)
      .set({ updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async listPeopleByIds(ids: string[]): Promise<Person[]> {
    if (!ids.length) return [];
    return this.conn.db.select().from(people).where(inArray(people.id, ids));
  }

  async listCategoriesByIds(ids: string[]): Promise<Category[]> {
    if (!ids.length) return [];
    return this.conn.db.select().from(categories).where(inArray(categories.id, ids));
  }

  async listPhotosForTasks(taskIds: string[]): Promise<TaskPhoto[]> {
    if (!taskIds.length) return [];
    return this.conn.db
      .select()
      .from(taskPhotos)
      .where(inArray(taskPhotos.taskId, taskIds))
      .orderBy(asc(taskPhotos.sortOrder), asc(taskPhotos.createdAt));
  }

  async listNotesForTasks(taskIds: string[]): Promise<TaskNote[]> {
    if (!taskIds.length) return [];
    return this.conn.db
      .select()
      .from(taskNotes)
      .where(inArray(taskNotes.taskId, taskIds))
      .orderBy(asc(taskNotes.createdAt));
  }

  async listRulesForTasks(taskIds: string[]): Promise<RecurringRule[]> {
    if (!taskIds.length) return [];
    return this.conn.db.select().from(recurringRules).where(inArray(recurringRules.taskId, taskIds));
  }

  async listAnnotationsForTasks(taskIds: string[]): Promise<AgentAnnotation[]> {
    if (!taskIds.length) return [];
    return this.conn.db
      .select()
      .from(agentAnnotations)
      .where(inArray(agentAnnotations.taskId, taskIds))
      .orderBy(asc(agentAnnotations.createdAt));
  }

  async addEvent(input: Omit<NewTaskEvent, "id" | "createdAt">): Promise<TaskEvent> {
    const [event] = await this.conn.db
      .insert(taskEvents)
      .values({
        id: newId("event"),
        ...input,
      })
      .returning();
    return event;
  }

  async listEvents(limit = 100): Promise<TaskEvent[]> {
    return this.conn.db.select().from(taskEvents).orderBy(desc(taskEvents.createdAt)).limit(limit);
  }

  async addPhoto(taskId: string, input: AttachPhotoInput): Promise<TaskPhoto> {
    const [photo] = await this.conn.db
      .insert(taskPhotos)
      .values({
        id: newId("photo"),
        taskId,
        ...input,
      })
      .returning();
    return photo;
  }

  async getPhoto(id: string): Promise<TaskPhoto | undefined> {
    const [photo] = await this.conn.db.select().from(taskPhotos).where(eq(taskPhotos.id, id)).limit(1);
    return photo;
  }

  async addNote(taskId: string, input: Omit<NewTaskNote, "id" | "taskId" | "createdAt">): Promise<TaskNote> {
    const [note] = await this.conn.db
      .insert(taskNotes)
      .values({
        id: newId("note"),
        taskId,
        ...input,
      })
      .returning();
    return note;
  }

  async addRecurringRule(input: Omit<NewRecurringRule, "id" | "createdAt" | "updatedAt">): Promise<RecurringRule> {
    const [rule] = await this.conn.db
      .insert(recurringRules)
      .values({
        id: newId("rule"),
        ...input,
        updatedAt: new Date(),
      })
      .returning();
    return rule;
  }

  async updateRecurringRule(
    taskId: string,
    input: Partial<Pick<NewRecurringRule, "frequency" | "interval" | "anchorDate" | "nextDueAt" | "endDate" | "lastCompletedAt" | "isActive">>,
  ) {
    const [rule] = await this.conn.db
      .update(recurringRules)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(recurringRules.taskId, taskId))
      .returning();
    return rule;
  }

  async addAnnotation(input: Omit<NewAgentAnnotation, "id" | "createdAt">): Promise<AgentAnnotation> {
    const [annotation] = await this.conn.db
      .insert(agentAnnotations)
      .values({
        id: newId("annotation"),
        ...input,
      })
      .returning();
    return annotation;
  }
}
