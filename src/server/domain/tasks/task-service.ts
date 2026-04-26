import type { Task } from "@/server/db/schema";
import { calculateNextDueAt, toDateOnly } from "@/server/domain/recurrence";
import { AppError, notFound } from "@/server/domain/errors";
import { getUrgencyBand, isTimeSensitive } from "@/server/domain/tasks/urgency";
import type {
  AddNoteInput,
  AttachPhotoInput,
  CreateTaskInput,
  TaskActor,
  TaskFilters,
  TaskWithContext,
  UpdateTaskInput,
} from "@/server/domain/tasks/task-types";
import { TaskRepository } from "@/server/domain/tasks/task-repository";

function actorFields(actor: TaskActor) {
  if (actor.type === "human") {
    return {
      actorType: "human" as const,
      actorPersonId: actor.personId,
      agentName: null,
    };
  }

  if (actor.type === "agent") {
    return {
      actorType: "agent" as const,
      actorPersonId: null,
      agentName: actor.agentName,
    };
  }

  return {
    actorType: "system" as const,
    actorPersonId: null,
    agentName: null,
  };
}

function cleanText(value: string, field: string, maxLength: number) {
  const next = value.trim();
  if (!next) {
    throw new AppError(`${field} is required`, 422, "validation_error");
  }
  if (next.length > maxLength) {
    throw new AppError(`${field} is too long`, 422, "validation_error");
  }
  return next;
}

export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  async listTasks(filters: TaskFilters = {}, now = new Date()) {
    const rows = await this.repo.listTasks(filters);
    const hydrated = await this.hydrate(rows, now);
    return filters.timeSensitive ? hydrated.filter((task) => isTimeSensitive(task, now)) : hydrated;
  }

  async getTask(id: string, now = new Date()) {
    const task = await this.repo.getTask(id);
    if (!task) {
      throw notFound("Task not found");
    }

    const [hydrated] = await this.hydrate([task], now);
    return hydrated;
  }

  async createTask(input: CreateTaskInput, actor: TaskActor) {
    const title = cleanText(input.title, "Title", 160);
    const description = (input.description ?? "").trim();
    if (description.length > 4000) {
      throw new AppError("Description is too long", 422, "validation_error");
    }

    const task = await this.repo.createTask({
      title,
      description,
      status: "active",
      priority: input.priority ?? "normal",
      dueAt: input.dueAt ?? null,
      plannedFor: input.plannedFor ?? null,
      categoryId: input.categoryId || "cat_house",
      assigneeId: input.assigneeId || "person_unassigned",
      createdById: input.createdById ?? null,
      completedAt: null,
      completedById: null,
      parentTaskId: null,
    });

    await this.repo.addEvent({
      taskId: task.id,
      ...actorFields(actor),
      eventType: "created",
      payload: {
        title: task.title,
        categoryId: task.categoryId,
        assigneeId: task.assigneeId,
        priority: task.priority,
        plannedFor: task.plannedFor,
      },
    });

    if (input.recurrence) {
      await this.repo.addRecurringRule({
        taskId: task.id,
        frequency: input.recurrence.frequency,
        interval: input.recurrence.interval,
        anchorDate: toDateOnly(input.recurrence.anchorDate),
        nextDueAt: input.dueAt ?? input.recurrence.anchorDate,
        lastCompletedAt: null,
        isActive: true,
      });
    }

    return this.getTask(task.id);
  }

  async updateTask(id: string, input: UpdateTaskInput, actor: TaskActor) {
    await this.ensureTask(id);
    const patch: UpdateTaskInput = { ...input };

    if (patch.title !== undefined) {
      patch.title = cleanText(patch.title, "Title", 160);
    }

    if (patch.description !== undefined && patch.description.length > 4000) {
      throw new AppError("Description is too long", 422, "validation_error");
    }

    const task = await this.repo.updateTask(id, patch);
    if (!task) {
      throw notFound("Task not found");
    }

    await this.repo.addEvent({
      taskId: id,
      ...actorFields(actor),
      eventType: "updated",
      payload: patch,
    });

    return this.getTask(id);
  }

  async completeTask(id: string, actor: TaskActor, completedAt = new Date()) {
    const existing = await this.getTask(id, completedAt);
    if (existing.status === "done") {
      return {
        completed: existing,
        nextTask: null,
      };
    }

    const actorEvent = actorFields(actor);
    await this.repo.updateTask(id, {
      status: "done",
      completedAt,
      completedById: actor.type === "human" ? actor.personId : null,
    });

    await this.repo.addEvent({
      taskId: id,
      ...actorEvent,
      eventType: "completed",
      payload: { completedAt: completedAt.toISOString() },
    });

    let nextTask: TaskWithContext | null = null;
    if (existing.recurringRule?.isActive) {
      const nextDueAt = calculateNextDueAt(
        {
          frequency: existing.recurringRule.frequency,
          interval: existing.recurringRule.interval,
          anchorDate: completedAt,
        },
        completedAt,
      );

      const child = await this.repo.createTask({
        title: existing.title,
        description: existing.description,
        status: "active",
        priority: existing.priority,
        dueAt: nextDueAt,
        plannedFor: null,
        categoryId: existing.categoryId,
        assigneeId: existing.assigneeId,
        createdById: existing.createdById,
        completedAt: null,
        completedById: null,
        parentTaskId: existing.id,
      });

      await this.repo.updateRecurringRule(existing.id, {
        lastCompletedAt: completedAt,
        nextDueAt,
        isActive: false,
      });

      await this.repo.addRecurringRule({
        taskId: child.id,
        frequency: existing.recurringRule.frequency,
        interval: existing.recurringRule.interval,
        anchorDate: toDateOnly(nextDueAt),
        nextDueAt,
        lastCompletedAt: null,
        isActive: true,
      });

      await this.repo.addEvent({
        taskId: existing.id,
        ...actorEvent,
        eventType: "recurrence_scheduled",
        payload: { nextTaskId: child.id, nextDueAt: nextDueAt.toISOString() },
      });

      nextTask = await this.getTask(child.id, completedAt);
    }

    return {
      completed: await this.getTask(id, completedAt),
      nextTask,
    };
  }

  async reopenTask(id: string, actor: TaskActor) {
    await this.ensureTask(id);
    await this.repo.updateTask(id, {
      status: "active",
      completedAt: null,
      completedById: null,
    });
    await this.repo.addEvent({
      taskId: id,
      ...actorFields(actor),
      eventType: "reopened",
      payload: {},
    });
    return this.getTask(id);
  }

  async splitTask(id: string, childTitles: string[], actor: TaskActor) {
    const parent = await this.getTask(id);
    const cleanedTitles = childTitles.map((title) => cleanText(title, "Child task title", 160));
    if (cleanedTitles.length < 2) {
      throw new AppError("Split needs at least two child tasks", 422, "validation_error");
    }

    const children: TaskWithContext[] = [];
    for (const title of cleanedTitles) {
      const child = await this.repo.createTask({
        title,
        description: "",
        status: "active",
        priority: parent.priority,
        dueAt: parent.dueAt,
        plannedFor: parent.plannedFor,
        categoryId: parent.categoryId,
        assigneeId: parent.assigneeId,
        createdById: parent.createdById,
        completedAt: null,
        completedById: null,
        parentTaskId: parent.id,
      });
      children.push(await this.getTask(child.id));
    }

    await this.repo.addEvent({
      taskId: id,
      ...actorFields(actor),
      eventType: "split",
      payload: { childTaskIds: children.map((child) => child.id) },
    });

    return {
      parent: await this.getTask(id),
      children,
    };
  }

  async addNote(id: string, input: AddNoteInput, actor: TaskActor) {
    await this.ensureTask(id);
    const body = cleanText(input.body, "Note", 4000);
    const note = await this.repo.addNote(id, {
      body,
      authorType: input.authorType,
      authorPersonId: input.authorPersonId ?? null,
      agentName: input.agentName ?? null,
    });

    await this.repo.addEvent({
      taskId: id,
      ...actorFields(actor),
      eventType: "note_added",
      payload: { noteId: note.id },
    });

    return note;
  }

  async attachPhoto(id: string, input: AttachPhotoInput, actor: TaskActor) {
    await this.ensureTask(id);
    const photo = await this.repo.addPhoto(id, {
      ...input,
      caption: input.caption ?? "",
      sortOrder: input.sortOrder ?? 0,
    });

    await this.repo.addEvent({
      taskId: id,
      ...actorFields(actor),
      eventType: "photo_added",
      payload: { photoId: photo.id, fileName: photo.fileName },
    });

    return photo;
  }

  async addAgentAnnotation(
    id: string,
    input: { agentName: string; kind: string; body: string; data?: Record<string, unknown> },
  ) {
    await this.ensureTask(id);
    const annotation = await this.repo.addAnnotation({
      taskId: id,
      agentName: cleanText(input.agentName, "Agent name", 120),
      kind: cleanText(input.kind, "Annotation kind", 80),
      body: cleanText(input.body, "Annotation body", 4000),
      data: input.data ?? {},
    });

    await this.repo.addEvent({
      taskId: id,
      actorType: "agent",
      actorPersonId: null,
      agentName: input.agentName,
      eventType: "annotation_added",
      payload: { annotationId: annotation.id, kind: annotation.kind },
    });

    return annotation;
  }

  async listEvents(limit = 100) {
    return this.repo.listEvents(limit);
  }

  async getPhoto(id: string) {
    const photo = await this.repo.getPhoto(id);
    if (!photo) {
      throw notFound("Photo not found");
    }
    return photo;
  }

  private async ensureTask(id: string): Promise<Task> {
    const task = await this.repo.getTask(id);
    if (!task) {
      throw notFound("Task not found");
    }
    return task;
  }

  private async hydrate(rows: Task[], now: Date): Promise<TaskWithContext[]> {
    const ids = rows.map((task) => task.id);
    const personIds = [...new Set(rows.flatMap((task) => [task.assigneeId, task.createdById]).filter(Boolean) as string[])];
    const categoryIds = [...new Set(rows.map((task) => task.categoryId))];
    const [people, categories, photos, notes, rules, annotations] = await Promise.all([
      this.repo.listPeopleByIds(personIds),
      this.repo.listCategoriesByIds(categoryIds),
      this.repo.listPhotosForTasks(ids),
      this.repo.listNotesForTasks(ids),
      this.repo.listRulesForTasks(ids),
      this.repo.listAnnotationsForTasks(ids),
    ]);

    const peopleById = new Map(people.map((person) => [person.id, person]));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const photosByTask = groupBy(photos, (photo) => photo.taskId);
    const notesByTask = groupBy(notes, (note) => note.taskId);
    const rulesByTask = new Map(rules.map((rule) => [rule.taskId, rule]));
    const annotationsByTask = groupBy(annotations, (annotation) => annotation.taskId);

    return rows.map((task) => {
      const category = categoriesById.get(task.categoryId);
      if (!category) {
        throw new AppError(`Task ${task.id} is missing its category`, 500, "data_integrity_error");
      }

      return {
        ...task,
        assignee: task.assigneeId ? peopleById.get(task.assigneeId) ?? null : null,
        category,
        photos: photosByTask.get(task.id) ?? [],
        notes: notesByTask.get(task.id) ?? [],
        recurringRule: rulesByTask.get(task.id) ?? null,
        annotations: annotationsByTask.get(task.id) ?? [],
        urgency: getUrgencyBand(task, now),
      };
    });
  }
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }
  return grouped;
}
