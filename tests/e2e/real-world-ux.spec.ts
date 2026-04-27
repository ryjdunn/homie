import { expect, test, type Page, type TestInfo } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = "postgres://localhost:5432/homie_e2e";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { message: string } };

type ApiTask = {
  id: string;
  title: string;
  status: "inbox" | "active" | "done" | "archived";
  priority: "low" | "normal" | "high" | "urgent";
  plannedFor: string | null;
  categoryId: string;
  assigneeId: string | null;
};

type TaskInput = {
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  dueAt?: string | null;
  plannedFor?: string | null;
  categoryId?: string;
  assigneeId?: string;
  createdById?: string;
  recurrence?: {
    frequency: "daily" | "weekly" | "every_n_days" | "monthly";
    interval: number;
    anchorDate: string;
  };
};

test.describe("real-world mobile UX and database validation", () => {
  test("loads the pre-populated household board quickly without browser errors", async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const loadedInMs = await gotoReady(page);

    const seedCard = taskCard(page, "E2E seed: take old cardboard to recycling");
    await expect(seedCard).toBeVisible();
    await expect(seedCard.getByText("Ryan", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add task" })).toBeVisible();
    expect(loadedInMs).toBeLessThan(testInfo.project.name === "desktop-smoke" ? 5_000 : 7_000);
    expect(consoleErrors).toEqual([]);

    await withDb(async (sql) => {
      const rows = await sql`
        select title, status
        from tasks
        where id in ('e2e_seed_dump', 'e2e_seed_towels', 'e2e_seed_sheets')
        order by id
      `;
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.status)).toEqual(["active", "active", "active"]);
    });
  });

  test("creates a simple task from the add flow and persists it to Postgres", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E add simple", testInfo);

    await addTaskViaUi(page, {
      title,
      description: "A normal household task added only through the browser.",
      categoryId: "cat_house",
      assigneeId: "person_unassigned",
      priority: "Normal",
    });

    await withDb(async (sql) => {
      const rows = await sql`
        select title, status, priority, category_id, assignee_id
        from tasks
        where title = ${title}
      `;
      expect(rows[0]).toMatchObject({
        title,
        status: "active",
        priority: "normal",
        category_id: "cat_house",
        assignee_id: "person_unassigned",
      });
    });
  });

  test("adds an urgent due-today task and shows it in the time-sensitive view", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E urgent today", testInfo);

    await addTaskViaUi(page, {
      title,
      description: "Needs attention today.",
      categoryId: "cat_sell_donate",
      assigneeId: "person_ryan",
      priority: "Urgent",
      dueAt: localDateTimeInput(0, 18, 15),
    });
    await page.getByRole("button", { name: "Today", exact: true }).click();

    await expect(taskCard(page, title)).toBeVisible();
    await withDb(async (sql) => {
      const rows = await sql`select due_at, priority from tasks where title = ${title}`;
      expect(rows[0]?.priority).toBe("urgent");
      expect(rows[0]?.due_at).toBeTruthy();
    });
  });

  test("uploads multiple photos from the UI and serves them back through the photo API", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E photo pile", testInfo);

    await addTaskViaUi(page, {
      title,
      description: "Photo-backed dump run task.",
      categoryId: "cat_sell_donate",
      assigneeId: "person_ryan",
      priority: "High",
      files: [
        { name: "pile-before.png", mimeType: "image/png", buffer: png },
        { name: "pile-side.png", mimeType: "image/png", buffer: png },
      ],
    });

    await gotoAll(page);
    await openTask(page, title);
    await expect(page.locator(".detail-sheet .photo-grid img")).toHaveCount(2);

    await withDb(async (sql) => {
      const rows = await sql`
        select p.id, p.file_name, p.mime_type, p.byte_size
        from task_photos p
        join tasks t on t.id = p.task_id
        where t.title = ${title}
        order by p.sort_order
      `;
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.file_name)).toEqual(["pile-before.png", "pile-side.png"]);

      const response = await page.request.get(`/api/photos/${rows[0]?.id}`);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/png");
    });
  });

  test("remembers the selected household actor across reloads", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E Caroline remembered", testInfo);

    await gotoReady(page);
    await setOwnerScope(page, "Caroline");
    const personPicker = page.locator(".person-picker");
    await page.reload();
    await expect(personPicker).toHaveText("Caroline");

    await addTaskViaUi(page, {
      title,
      description: "Created while Caroline is selected.",
      categoryId: "cat_house",
      assigneeId: "person_caroline",
      priority: "Low",
    });

    await withDb(async (sql) => {
      const rows = await sql`
        select created_by_id, assignee_id
        from tasks
        where title = ${title}
      `;
      expect(rows[0]).toMatchObject({ created_by_id: "person_caroline", assignee_id: "person_caroline" });
    });
  });

  test("comments on a task through the detail sheet and records note provenance", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E note", testInfo);
    const note = `Bring gloves from shelf ${testInfo.project.name}`;
    await createTaskViaApi(page, { title, categoryId: "cat_house", assigneeId: "person_ryan" });

    await gotoAll(page);
    await openTask(page, title);
    await page.getByPlaceholder("Add a note").fill(note);
    await page.getByRole("button", { name: "Send note" }).click();

    await expect(page.getByText(note)).toBeVisible();
    await withDb(async (sql) => {
      const rows = await sql`
        select n.body, n.author_type, n.author_person_id
        from task_notes n
        join tasks t on t.id = n.task_id
        where t.title = ${title}
      `;
      expect(rows[0]).toMatchObject({ body: note, author_type: "human", author_person_id: "person_ryan" });
    });
  });

  test("shows pre-planned household work in the next seven days view", async ({ page }) => {
    await gotoWeek(page);

    const week = page.getByLabel("Next 7 days", { exact: true });
    const plannedDayCount = await week.getByTestId("week-day-card").count();
    expect(plannedDayCount).toBeGreaterThanOrEqual(2);
    expect(plannedDayCount).toBeLessThanOrEqual(7);
    await expect(plannedTaskCard(page, "E2E seed: take old cardboard to recycling")).toBeVisible();
    await expect(plannedTaskCard(page, "E2E seed: wash guest towels")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("plans an unplanned task for tomorrow from the detail sheet and persists it", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E plan tomorrow", testInfo);
    await createTaskViaApi(page, {
      title,
      description: "Caroline can decide this belongs on tomorrow's board.",
      categoryId: "cat_house",
      assigneeId: "person_caroline",
      plannedFor: null,
    });

    await gotoAll(page);
    await openTask(page, title);
    const detail = page.getByLabel("Task detail", { exact: true });
    await detail.getByText("Plan for a day", { exact: true }).click();
    await page.getByRole("button", { name: `Plan ${title} for Tomorrow` }).click();

    await expect(detail.locator(".detail-chips").getByText("Planned tomorrow", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close task detail" }).click();
    await gotoWeek(page);
    await expect(plannedTaskCard(page, title)).toBeVisible();

    await withDb(async (sql) => {
      const rows = await sql`
        select planned_for::text as planned_for
        from tasks
        where title = ${title}
      `;
      expect(rows[0]?.planned_for).toBe(localDateKey(1));
    });
  });

  test("clears a planned day from the detail sheet without losing the task", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E clear plan", testInfo);
    await createTaskViaApi(page, {
      title,
      categoryId: "cat_house",
      assigneeId: "person_ryan",
      plannedFor: localDateKey(2),
    });

    await gotoAll(page);
    await openTask(page, title);
    await page.getByRole("button", { name: `Clear plan for ${title}` }).click();

    await expect(page.getByRole("button", { name: `Clear plan for ${title}` })).toHaveCount(0);
    await page.getByRole("button", { name: "Close task detail" }).click();
    await expect(taskCard(page, title)).toBeVisible();
    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(plannedTaskCard(page, title)).toHaveCount(0);

    await withDb(async (sql) => {
      const rows = await sql`
        select planned_for
        from tasks
        where title = ${title}
      `;
      expect(rows[0]?.planned_for).toBeNull();
    });
  });

  test("completes a planned task from the Week view and removes it from the plan", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E planned done", testInfo);
    await createTaskViaApi(page, {
      title,
      categoryId: "cat_house",
      assigneeId: "person_ryan",
      plannedFor: localDateKey(0),
    });

    await gotoWeek(page, "Ryan");
    const card = plannedTaskCard(page, title);
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: `Complete ${title}` }).click();
    await expect(plannedTaskCard(page, title)).toHaveCount(0);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(taskCard(page, title)).toBeVisible();

    await withDb(async (sql) => {
      const rows = await sql`
        select status, completed_by_id, planned_for::text as planned_for
        from tasks
        where title = ${title}
      `;
      expect(rows[0]).toMatchObject({
        status: "done",
        completed_by_id: "person_ryan",
        planned_for: localDateKey(0),
      });
    });
  });

  test("completes a task, celebrates it in Done, and stores completion metadata", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E complete", testInfo);
    await createTaskViaApi(page, { title, categoryId: "cat_errands", assigneeId: "person_ryan" });

    await gotoAll(page);
    await page.getByRole("button", { name: `Complete ${title}` }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();

    await expect(taskCard(page, title)).toBeVisible();
    await withDb(async (sql) => {
      const rows = await sql`
        select status, completed_by_id, completed_at
        from tasks
        where title = ${title}
      `;
      expect(rows[0]?.status).toBe("done");
      expect(rows[0]?.completed_by_id).toBe("person_ryan");
      expect(rows[0]?.completed_at).toBeTruthy();
    });
  });

  test("reopens a completed task from the Done view", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E reopen", testInfo);
    await createTaskViaApi(page, { title, categoryId: "cat_house", assigneeId: "person_caroline" });

    await gotoAll(page);
    await page.getByRole("button", { name: `Complete ${title}` }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: `Reopen ${title}` }).click();
    await page.getByRole("button", { name: "All", exact: true }).click();

    await expect(taskCard(page, title)).toBeVisible();
    await withDb(async (sql) => {
      const rows = await sql`select status, completed_at from tasks where title = ${title}`;
      expect(rows[0]).toMatchObject({ status: "active", completed_at: null });
    });
  });

  test("removes a task from the board via the UI archive flow", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E remove", testInfo);
    await createTaskViaApi(page, { title, categoryId: "cat_house", assigneeId: "person_unassigned" });

    await gotoAll(page);
    await openTask(page, title);
    await page.getByRole("button", { name: "Remove task" }).click();

    await expect(taskCard(page, title)).toHaveCount(0);
    await withDb(async (sql) => {
      const rows = await sql`select status from tasks where title = ${title}`;
      expect(rows[0]?.status).toBe("archived");
    });
  });

  test("filters by category without hiding matching household tasks", async ({ page }, testInfo) => {
    const dumpTitle = uniqueTitle("E2E category dump", testInfo);
    const houseTitle = uniqueTitle("E2E category house", testInfo);
    await createTaskViaApi(page, { title: dumpTitle, categoryId: "cat_sell_donate", assigneeId: "person_ryan" });
    await createTaskViaApi(page, { title: houseTitle, categoryId: "cat_house", assigneeId: "person_ryan" });

    await gotoAll(page);
    await page.getByLabel("Category filter").selectOption("cat_sell_donate");

    await expect(taskCard(page, dumpTitle)).toBeVisible();
    await expect(taskCard(page, houseTitle)).toHaveCount(0);
  });

  test("filters by assignee for Ryan and Caroline-specific work", async ({ page }, testInfo) => {
    const ryanTitle = uniqueTitle("E2E assignee Ryan", testInfo);
    const carolineTitle = uniqueTitle("E2E assignee Caroline", testInfo);
    await createTaskViaApi(page, { title: ryanTitle, categoryId: "cat_house", assigneeId: "person_ryan" });
    await createTaskViaApi(page, { title: carolineTitle, categoryId: "cat_house", assigneeId: "person_caroline" });

    await gotoAll(page);
    await page.getByLabel("Assignee filter").selectOption("person_caroline");

    await expect(taskCard(page, carolineTitle)).toBeVisible();
    await expect(taskCard(page, ryanTitle)).toHaveCount(0);
  });

  test("time-sensitive toggle suppresses normal future work", async ({ page }, testInfo) => {
    const urgentTitle = uniqueTitle("E2E toggle urgent", testInfo);
    const normalTitle = uniqueTitle("E2E toggle later", testInfo);
    await createTaskViaApi(page, {
      title: urgentTitle,
      priority: "urgent",
      dueAt: isoFromLocalInput(localDateTimeInput(0, 20, 30)),
      categoryId: "cat_house",
      assigneeId: "person_ryan",
    });
    await createTaskViaApi(page, {
      title: normalTitle,
      priority: "normal",
      dueAt: isoFromLocalInput(localDateTimeInput(14, 10, 0)),
      categoryId: "cat_house",
      assigneeId: "person_ryan",
    });

    await gotoAll(page);
    await expect(taskCard(page, urgentTitle)).toBeVisible();
    await expect(taskCard(page, normalTitle)).toBeVisible();
    await page.getByRole("button", { name: "Filter time-sensitive tasks" }).click();

    await expect(taskCard(page, urgentTitle)).toBeVisible();
    await expect(taskCard(page, normalTitle)).toHaveCount(0);
  });

  test("future normal work stays out of Today but remains available in All", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E future normal", testInfo);
    await createTaskViaApi(page, {
      title,
      priority: "normal",
      dueAt: isoFromLocalInput(localDateTimeInput(30, 9, 0)),
      categoryId: "cat_house",
      assigneeId: "person_unassigned",
    });

    await gotoReady(page);
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect(taskCard(page, title)).toHaveCount(0);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(taskCard(page, title)).toBeVisible();
  });

  test("long household task names wrap cleanly without horizontal overflow", async ({ page }, testInfo) => {
    const title = uniqueTitle(
      "E2E unusually long title for the garage corner recycling staging and dump run checklist",
      testInfo,
    );
    await createTaskViaApi(page, {
      title,
      description: "This deliberately long row should not blow up the mobile viewport.",
      categoryId: "cat_sell_donate",
      assigneeId: "person_ryan",
    });

    await gotoAll(page);

    await expect(taskCard(page, title)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("detail sheet renders category, assignee, priority, due date, and description", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E detail metadata", testInfo);
    await createTaskViaApi(page, {
      title,
      description: "Metadata should be visible before someone acts on the task.",
      priority: "high",
      dueAt: isoFromLocalInput(localDateTimeInput(1, 11, 45)),
      categoryId: "cat_house",
      assigneeId: "person_caroline",
    });

    await gotoAll(page);
    await openTask(page, title);

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const detail = page.getByLabel("Task detail", { exact: true });
    const chips = detail.locator(".detail-chips");
    await expect(detail.locator(".detail-header .eyebrow")).toHaveText("House");
    await expect(chips.getByText("Caroline", { exact: true })).toBeVisible();
    await expect(chips.getByText("High", { exact: true })).toBeVisible();
    await expect(detail.getByText("Metadata should be visible")).toBeVisible();
  });

  test("browser validation prevents blank task submissions", async ({ page }, testInfo) => {
    const markerTitle = uniqueTitle("E2E should not exist", testInfo);
    await gotoReady(page);
    await page.getByRole("button", { name: "Add task" }).click();
    const addPanel = page.locator("form.add-panel");
    await addPanel.getByRole("textbox", { name: "Note" }).fill(markerTitle);
    await expect(addPanel.getByRole("button", { name: "Add task", exact: true })).toBeDisabled();
    await withDb(async (sql) => {
      const rows = await sql`select id from tasks where title = ${markerTitle}`;
      expect(rows).toHaveLength(0);
    });
  });

  test("note submission is disabled when empty and enabled when useful", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E note disabled", testInfo);
    await createTaskViaApi(page, { title, categoryId: "cat_house", assigneeId: "person_ryan" });

    await gotoAll(page);
    await openTask(page, title);

    const sendButton = page.getByRole("button", { name: "Send note" });
    await expect(sendButton).toBeDisabled();
    await page.getByPlaceholder("Add a note").fill("This note makes the button useful.");
    await expect(sendButton).toBeEnabled();
  });

  test("recurring tasks complete into the next open occurrence", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E recurring sheets", testInfo);
    const dueAt = isoFromLocalInput(localDateTimeInput(0, 16, 0));
    await createTaskViaApi(page, {
      title,
      priority: "normal",
      dueAt,
      categoryId: "cat_house",
      assigneeId: "person_caroline",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        anchorDate: dueAt,
      },
    });

    await gotoAll(page);
    await page.getByRole("button", { name: `Complete ${title}` }).click();

    await expect
      .poll(
        () =>
          withDb(async (sql) => {
            const rows = await sql`
              select count(*)::int as count
              from tasks
              where title = ${title}
            `;
            return rows[0]?.count;
          }),
        { timeout: 10_000 },
      )
      .toBe(2);

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(taskCard(page, title)).toBeVisible();

    await withDb(async (sql) => {
      const rows = await sql`
        select status, parent_task_id, due_at
        from tasks
        where title = ${title}
        order by created_at
      `;
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.status)).toEqual(["done", "active"]);
      expect(rows[1]?.parent_task_id).toBeTruthy();
      expect(new Date(rows[1]?.due_at as Date).getTime()).toBeGreaterThan(new Date(dueAt).getTime());
    });
  });

  test("agent APIs can see UI-created work and write annotations for future agents", async ({ page }, testInfo) => {
    const title = uniqueTitle("E2E agent visible", testInfo);
    await addTaskViaUi(page, {
      title,
      description: "Task created from the UX, then inspected by the agent API.",
      categoryId: "cat_house",
      assigneeId: "person_unassigned",
      priority: "High",
    });

    const task = await getTaskByTitle(title);
    const agentTasks = await apiGet<{ title: string }[]>(page, "/api/agent/tasks?status=open");
    expect(agentTasks.some((item) => item.title === title)).toBe(true);

    const annotationResponse = await page.request.post(`/api/agent/tasks/${task.id}/annotations`, {
      data: {
        agentName: "openclaw-e2e",
        kind: "research",
        body: "Agent-visible annotation from the end-to-end suite.",
        data: { confidence: 0.91 },
      },
    });
    expect(annotationResponse.ok()).toBe(true);

    const events = await apiGet<{ eventType: string; agentName: string | null }[]>(page, "/api/agent/events?limit=50");
    expect(events.some((event) => event.eventType === "annotation_added" && event.agentName === "openclaw-e2e")).toBe(true);
  });

  test("core mobile controls keep comfortable tap targets after scrolling", async ({ page }) => {
    await gotoReady(page);
    await expectNoHorizontalOverflow(page);

    const controls = [
      page.getByRole("button", { name: "Add task" }),
      page.getByRole("button", { name: "Today", exact: true }),
      page.getByRole("button", { name: "Week", exact: true }),
      page.getByRole("button", { name: "All", exact: true }),
      page.getByRole("button", { name: "Done", exact: true }),
    ];

    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(38);
      expect(box?.height).toBeGreaterThanOrEqual(38);
    }
  });
});

async function gotoReady(page: Page) {
  const startedAt = Date.now();
  await page.goto("/");
  await page.getByRole("button", { name: "Add task" }).waitFor();
  return Date.now() - startedAt;
}

async function gotoAll(page: Page) {
  await gotoReady(page);
  await page.getByRole("button", { name: "All", exact: true }).click();
}

async function gotoWeek(page: Page, scope: "Ryan" | "Caroline" | "All" = "All") {
  await gotoReady(page);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await setOwnerScope(page, scope);
}

function taskCard(page: Page, title: string) {
  return page.getByTestId("task-card").filter({ hasText: title });
}

function plannedTaskCard(page: Page, title: string) {
  return page.getByLabel("Next 7 days", { exact: true }).getByTestId("task-card").filter({ hasText: title });
}

async function openTask(page: Page, title: string) {
  const card = taskCard(page, title);
  await expect(card).toHaveCount(1);
  await card.getByRole("button").filter({ hasText: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

async function addTaskViaUi(
  page: Page,
  input: {
    title: string;
    description?: string;
    categoryId: string;
    assigneeId: string;
    priority: "Low" | "Normal" | "High" | "Urgent";
    dueAt?: string;
    files?: Array<{ name: string; mimeType: string; buffer: Buffer }>;
  },
) {
  await gotoReady(page);
  await page.getByRole("button", { name: "Add task" }).click();
  const addPanel = page.locator("form.add-panel");
  await addPanel.getByRole("textbox", { name: "Task" }).fill(input.title);
  await addPanel.getByRole("textbox", { name: "Note" }).fill(input.description ?? "");
  await addPanel.getByLabel("Category").selectOption(input.categoryId);
  await addPanel.getByLabel("For").selectOption(input.assigneeId);
  await addPanel.getByRole("button", { name: input.priority }).click();
  if (input.dueAt) {
    await addPanel.getByLabel("Due").fill(input.dueAt.slice(0, 10));
  }
  if (input.files?.length) {
    await addPanel.locator('input[type="file"]').nth(1).setInputFiles(input.files);
  }
  await addPanel.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(addPanel).toHaveCount(0);
}

async function setOwnerScope(page: Page, label: "Ryan" | "Caroline" | "All") {
  const personPicker = page.locator(".person-picker");
  await expect(personPicker).toBeVisible();
  for (let index = 0; index < 4; index += 1) {
    if ((await personPicker.innerText()).trim() === label) return;
    await personPicker.click();
  }
  await expect(personPicker).toHaveText(label);
}

async function createTaskViaApi(page: Page, input: TaskInput) {
  const response = await page.request.post("/api/tasks", {
    headers: { "x-homie-person-id": input.createdById ?? "person_ryan" },
    data: {
      description: "",
      priority: "normal",
      dueAt: null,
      categoryId: "cat_house",
      assigneeId: "person_unassigned",
      createdById: input.createdById ?? "person_ryan",
      ...input,
    },
  });
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as ApiEnvelope<ApiTask>;
  if (!payload.ok) throw new Error(payload.error.message);
  return payload.data;
}

async function apiGet<T>(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.ok) throw new Error(payload.error.message);
  return payload.data;
}

async function getTaskByTitle(title: string) {
  return withDb(async (sql) => {
    const rows = await sql`
      select id, title, status
      from tasks
      where title = ${title}
      order by created_at desc
      limit 1
    `;
    expect(rows).toHaveLength(1);
    return rows[0] as { id: string; title: string; status: string };
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function withDb<T>(fn: (sql: ReturnType<typeof postgres>) => Promise<T>) {
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

function uniqueTitle(prefix: string, testInfo: TestInfo) {
  const safeProject = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-");
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return `${prefix} ${safeProject} ${suffix}`.slice(0, 155);
}

function localDateTimeInput(daysFromNow: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateKey(daysFromNow: number) {
  return localDateTimeInput(daysFromNow, 12, 0).slice(0, 10);
}

function isoFromLocalInput(value: string) {
  return new Date(value).toISOString();
}
