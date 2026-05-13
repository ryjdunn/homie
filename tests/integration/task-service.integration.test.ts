import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { createTestServices, resetTestData } from "./test-db";

const services = createTestServices();

beforeEach(async () => {
  await resetTestData(services.conn);
});

afterAll(async () => {
  await services.conn.sql.end();
});

describe("TaskService against Postgres", () => {
  it("seeds and finds the starter household catalog", async () => {
    const people = await services.catalog.listPeople();
    const categories = await services.catalog.listCategories();

    expect(people.map((person) => person.slug)).toEqual(["unassigned", "ryan", "caroline"]);
    expect(categories.map((category) => category.slug)).toEqual(["house", "sell-donate", "errands", "kai"]);
    expect(await services.catalog.findPersonBySlug("ryan")).toMatchObject({ name: "Ryan" });
    expect(await services.catalog.findCategoryBySlug("sell-donate")).toMatchObject({ name: "Sell/Donate" });
  });

  it("creates, hydrates, filters, completes, and logs task events", async () => {
    const task = await services.tasks.createTask(
      {
        title: "Take wood stack to the dump",
        description: "Back left corner by the fence",
        priority: "urgent",
        dueAt: addDays(new Date("2026-04-26T12:00:00.000Z"), 1),
        categoryId: "cat_sell_donate",
        assigneeId: "person_ryan",
        createdById: "person_ryan",
      },
      { type: "human", personId: "person_ryan" },
    );

    expect(task.category.name).toBe("Sell/Donate");
    expect(task.assignee?.name).toBe("Ryan");
    expect(task.urgency).toBe("urgent");

    const timeSensitive = await services.tasks.listTasks({ status: "open", timeSensitive: true });
    expect(timeSensitive.map((item) => item.id)).toContain(task.id);

    const result = await services.tasks.completeTask(task.id, { type: "human", personId: "person_ryan" });
    expect(result.completed.status).toBe("done");
    expect(result.completed.completedById).toBe("person_ryan");

    const events = await services.tasks.listEvents();
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining(["created", "completed"]));
  });

  it("updates, filters, reopens, and handles idempotent completion", async () => {
    const task = await services.tasks.createTask(
      {
        title: "Old title",
        description: "",
        priority: "low",
        dueAt: null,
        categoryId: "cat_house",
        assigneeId: "person_unassigned",
        createdById: "person_ryan",
      },
      { type: "system" },
    );

    const updated = await services.tasks.updateTask(
      task.id,
      {
        title: "Schedule donation pickup",
        description: "Try Saturday morning.",
        priority: "high",
        assigneeId: "person_caroline",
      },
      { type: "agent", agentName: "openclaw" },
    );

    expect(updated.title).toBe("Schedule donation pickup");
    expect(updated.assignee?.name).toBe("Caroline");

    const filtered = await services.tasks.listTasks({
      status: "open",
      assigneeId: "person_caroline",
      categoryId: "cat_house",
      priority: "high",
    });
    expect(filtered).toHaveLength(1);

    await services.tasks.completeTask(task.id, { type: "agent", agentName: "openclaw" });
    const secondComplete = await services.tasks.completeTask(task.id, { type: "agent", agentName: "openclaw" });
    expect(secondComplete.nextTask).toBeNull();

    const reopened = await services.tasks.reopenTask(task.id, { type: "human", personId: "person_ryan" });
    expect(reopened.status).toBe("active");
    expect(reopened.completedAt).toBeNull();
  });

  it("plans tasks into calendar days, filters them, and clears them", async () => {
    const task = await services.tasks.createTask(
      {
        title: "Plan towel reset",
        description: "Caroline wants this on the visible week board.",
        priority: "normal",
        dueAt: null,
        plannedFor: "2026-04-29",
        categoryId: "cat_house",
        assigneeId: "person_caroline",
        createdById: "person_ryan",
      },
      { type: "human", personId: "person_ryan" },
    );

    expect(task.plannedFor).toBe("2026-04-29");
    const planned = await services.tasks.listTasks({ status: "open", plannedFor: "2026-04-29" });
    expect(planned.map((item) => item.id)).toEqual([task.id]);

    const moved = await services.tasks.updateTask(
      task.id,
      { plannedFor: "2026-04-30" },
      { type: "human", personId: "person_caroline" },
    );
    expect(moved.plannedFor).toBe("2026-04-30");

    const cleared = await services.tasks.updateTask(task.id, { plannedFor: null }, { type: "human", personId: "person_caroline" });
    expect(cleared.plannedFor).toBeNull();

  });

  it("returns the sort board as ordered groups with loose tiles last", async () => {
    await services.tasks.createTask(
      {
        title: "Donate shoes",
        description: "",
        priority: "normal",
        dueAt: null,
        categoryId: "cat_sell_donate",
        assigneeId: "person_caroline",
        createdById: "person_ryan",
        sortGroupId: "sort_group_donate",
        sortGroupName: "Donate",
        sortOrder: 220,
      },
      { type: "human", personId: "person_ryan" },
    );
    await services.tasks.createTask(
      {
        title: "Donate towels",
        description: "",
        priority: "normal",
        dueAt: null,
        categoryId: "cat_sell_donate",
        assigneeId: "person_caroline",
        createdById: "person_ryan",
        sortGroupId: "sort_group_donate",
        sortGroupName: "Donate",
        sortOrder: 210,
      },
      { type: "human", personId: "person_ryan" },
    );
    await services.tasks.createTask(
      {
        title: "Scope garage fridge",
        description: "",
        priority: "normal",
        dueAt: null,
        categoryId: "cat_house",
        assigneeId: "person_ryan",
        createdById: "person_ryan",
        sortGroupId: "sort_group_garage",
        sortGroupName: "Garage",
        sortOrder: 100,
      },
      { type: "human", personId: "person_ryan" },
    );
    const loose = await services.tasks.createTask(
      {
        title: "Loose errand",
        description: "",
        priority: "low",
        dueAt: null,
        categoryId: "cat_errands",
        assigneeId: "person_unassigned",
        createdById: "person_ryan",
        sortOrder: 20,
      },
      { type: "human", personId: "person_ryan" },
    );
    const done = await services.tasks.createTask(
      {
        title: "Already done",
        description: "",
        priority: "normal",
        dueAt: null,
        categoryId: "cat_house",
        assigneeId: "person_ryan",
        createdById: "person_ryan",
        sortGroupId: "sort_group_garage",
        sortGroupName: "Garage",
        sortOrder: 90,
      },
      { type: "human", personId: "person_ryan" },
    );
    await services.tasks.completeTask(done.id, { type: "human", personId: "person_ryan" });

    const board = await services.tasks.getSortBoard();

    expect(board.summary).toMatchObject({ taskCount: 4, groupCount: 2, looseCount: 1 });
    expect(board.groups.map((group) => group.name)).toEqual(["Garage", "Donate"]);
    expect(board.groups[1].tasks.map((task) => task.title)).toEqual(["Donate towels", "Donate shoes"]);
    expect(board.loose).toMatchObject({ id: "loose", name: "Loose tiles", taskCount: 1 });
    expect(board.loose.tasks.map((task) => task.id)).toEqual([loose.id]);
  });

  it("supports exact status filters and archived inclusion", async () => {
    const task = await services.tasks.createTask(
      {
        title: "Archive me later",
        description: "",
        priority: "normal",
        dueAt: null,
        categoryId: "cat_house",
        assigneeId: "person_unassigned",
        createdById: "person_ryan",
      },
      { type: "human", personId: "person_ryan" },
    );

    await services.tasks.completeTask(task.id, { type: "human", personId: "person_ryan" });
    expect(await services.tasks.listTasks({ status: "done" })).toHaveLength(1);

    await services.tasks.updateTask(task.id, { status: "archived" }, { type: "human", personId: "person_ryan" });
    expect(await services.tasks.listTasks()).toHaveLength(0);
    expect(await services.tasks.listTasks({ includeArchived: true })).toHaveLength(1);
  });

  it("raises not found when mutation targets disappear", async () => {
    await expect(
      services.tasks.updateTask("missing", { title: "Nope" }, { type: "human", personId: "person_ryan" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("adds notes, photos, and agent annotations with explicit provenance", async () => {
    const task = await services.tasks.createTask(
      {
        title: "Research towel replacement",
        description: "",
        priority: "normal",
        dueAt: null,
        categoryId: "cat_house",
        assigneeId: "person_caroline",
        createdById: "person_ryan",
      },
      { type: "human", personId: "person_ryan" },
    );

    const note = await services.tasks.addNote(
      task.id,
      {
        body: "Caroline likes checking these off.",
        authorType: "human",
        authorPersonId: "person_caroline",
        agentName: null,
      },
      { type: "human", personId: "person_caroline" },
    );
    const photo = await services.tasks.attachPhoto(
      task.id,
      {
        fileName: "towels.jpg",
        mimeType: "image/jpeg",
        byteSize: 123,
        storageKey: "test-towels.jpg",
        width: null,
        height: null,
        caption: "",
        sortOrder: 0,
      },
      { type: "human", personId: "person_ryan" },
    );
    const metadataAnnotation = await services.tasks.addAgentAnnotation(task.id, {
      agentName: "openclaw",
      kind: "research",
      body: "Metadata only; this should not drive the review marker.",
    });
    const metadataOnly = await services.tasks.getTask(task.id);
    expect(metadataOnly.agentReview.isFresh).toBe(false);

    const needsReviewBefore = await services.tasks.listTasks({ status: "open", needsReview: true });
    expect(needsReviewBefore.map((item) => item.id)).toContain(task.id);

    const annotation = await services.tasks.addAgentReview(task.id, {
      agentName: "openclaw",
      body: "Potential batch with linen closet cleanup.",
      canHelp: true,
      helpKinds: ["research"],
      nextAction: "research",
      confidence: 0.82,
    });

    const hydrated = await services.tasks.getTask(task.id);
    expect(hydrated.notes[0]?.id).toBe(note.id);
    expect(hydrated.photos[0]?.id).toBe(photo.id);
    expect(hydrated.annotations.map((item) => item.id)).toEqual(expect.arrayContaining([metadataAnnotation.id, annotation.id]));
    expect(hydrated.annotations.find((item) => item.id === annotation.id)?.kind).toBe("review");
    expect(hydrated.agentReview).toMatchObject({
      isFresh: true,
      agentName: "openclaw",
    });

    const needsReviewAfter = await services.tasks.listTasks({ status: "open", needsReview: true });
    expect(needsReviewAfter.map((item) => item.id)).not.toContain(task.id);

    const changedAfterReview = await services.tasks.updateTask(
      task.id,
      { priority: "high" },
      { type: "human", personId: "person_ryan" },
    );
    expect(changedAfterReview.agentReview.isFresh).toBe(false);
    const needsReviewAfterChange = await services.tasks.listTasks({ status: "open", needsReview: true });
    expect(needsReviewAfterChange.map((item) => item.id)).toContain(task.id);

    const events = await services.tasks.listEvents();
    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["note_added", "photo_added", "annotation_added"]),
    );
  });

  it("rolls recurring tasks forward into a fresh open task", async () => {
    const dueAt = new Date("2026-04-26T16:00:00.000Z");
    const task = await services.tasks.createTask(
      {
        title: "Wash sheets",
        description: "Use the linen closet backup set.",
        priority: "normal",
        dueAt,
        categoryId: "cat_house",
        assigneeId: "person_caroline",
        createdById: "person_ryan",
        recurrence: {
          frequency: "weekly",
          interval: 1,
          anchorDate: dueAt,
        },
      },
      { type: "human", personId: "person_ryan" },
    );

    await services.tasks.addNote(
      task.id,
      {
        body: "This week's sheets are already in the laundry room.",
        authorType: "human",
        authorPersonId: "person_caroline",
        agentName: null,
      },
      { type: "human", personId: "person_caroline" },
    );

    const result = await services.tasks.completeTask(task.id, { type: "human", personId: "person_caroline" }, dueAt);
    expect(result.completed.status).toBe("done");
    expect(result.completed.notes.map((note) => note.body)).toContain("This week's sheets are already in the laundry room.");
    expect(result.nextTask?.title).toBe("Wash sheets");
    expect(result.nextTask?.description).toBe("Use the linen closet backup set.");
    expect(result.nextTask?.parentTaskId).toBe(task.id);
    expect(result.nextTask?.plannedFor).toBeNull();
    expect(result.nextTask?.dueAt?.toISOString()).toBe("2026-05-03T16:00:00.000Z");
    expect(result.nextTask?.recurringRule?.isActive).toBe(true);
    expect(result.nextTask?.notes).toEqual([]);
  });

  it("rejects invalid service requests and missing resources clearly", async () => {
    await expect(
      services.tasks.createTask(
        {
          title: " ",
          description: "",
          priority: "normal",
          dueAt: null,
          categoryId: "cat_house",
          assigneeId: "person_unassigned",
          createdById: "person_ryan",
        },
        { type: "human", personId: "person_ryan" },
      ),
    ).rejects.toMatchObject({ statusCode: 422 });

    await expect(services.tasks.getTask("missing")).rejects.toMatchObject({ statusCode: 404 });
    await expect(services.tasks.getPhoto("missing")).rejects.toMatchObject({ statusCode: 404 });

  });
});
