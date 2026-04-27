"use client";

import {
  CalendarDays,
  CalendarClock,
  Camera,
  Check,
  Circle,
  ClipboardCheck,
  ImagePlus,
  Inbox,
  ListFilter,
  Plus,
  Repeat2,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type Person = {
  id: string;
  name: string;
  slug: string;
  initials: string;
  color: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
};

type TaskPhoto = {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  caption: string;
};

type TaskNote = {
  id: string;
  body: string;
  authorType: "human" | "agent" | "system";
  authorPersonId: string | null;
  agentName: string | null;
  createdAt: string;
};

type RecurrenceFrequency = "daily" | "weekly" | "every_n_days" | "monthly";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "inbox" | "active" | "done" | "archived";
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: string | null;
  plannedFor: string | null;
  completedAt: string | null;
  assigneeId: string | null;
  createdById: string | null;
  categoryId: string;
  assignee: Person | null;
  createdBy: Person | null;
  category: Category;
  photos: TaskPhoto[];
  notes: TaskNote[];
  recurringRule: {
    id: string;
    frequency: RecurrenceFrequency;
    interval: number;
    anchorDate: string;
    nextDueAt: string;
    endDate: string | null;
    isActive: boolean;
  } | null;
  urgency: "overdue" | "today" | "soon" | "urgent" | "normal" | "done";
};

type Bootstrap = {
  people: Person[];
  categories: Category[];
  defaultPersonId: string;
};

type ViewMode = "today" | "week" | "all" | "add" | "done";

const priorityLabels = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const urgencyLabels = {
  overdue: "Overdue",
  today: "Today",
  soon: "Soon",
  urgent: "Urgent",
  normal: "No rush",
  done: "Done",
};

export function HomieApp() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewMode>("today");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentPersonId, setCurrentPersonId] = useState(() => {
    if (typeof window === "undefined") return "person_ryan";
    return window.localStorage.getItem("homie.personId") || "person_ryan";
  });
  const [personScopeId, setPersonScopeId] = useState(() => {
    if (typeof window === "undefined") return "person_ryan";
    return window.localStorage.getItem("homie.personScopeId") || window.localStorage.getItem("homie.personId") || "person_ryan";
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [timeSensitiveOnly, setTimeSensitiveOnly] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [recentlyCompletedId, setRecentlyCompletedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const planningDays = useMemo(() => nextSevenDays(), []);
  const todayKey = dateKey(new Date());

  async function refresh() {
    const [bootstrapData, taskData] = await Promise.all([
      api<Bootstrap>("/api/bootstrap"),
      api<Task[]>("/api/tasks"),
    ]);
    startTransition(() => {
      setBootstrap(bootstrapData);
      setTasks(taskData);
      const remembered = window.localStorage.getItem("homie.personId");
      setCurrentPersonId(remembered || bootstrapData.defaultPersonId);
    });
  }

  useEffect(() => {
    refresh().catch((nextError) => setError(nextError.message));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("homie.personId", currentPersonId);
  }, [currentPersonId]);

  useEffect(() => {
    window.localStorage.setItem("homie.personScopeId", personScopeId);
  }, [personScopeId]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (view === "done") return task.status === "done";
      if (view === "add" || view === "today" || view === "week") return false;
      if (task.status === "done") return false;
      if (categoryFilter !== "all" && task.categoryId !== categoryFilter) return false;
      if (assigneeFilter !== "all" && task.assigneeId !== assigneeFilter) return false;
      if (timeSensitiveOnly && task.urgency === "normal") return false;
      return true;
    });
  }, [assigneeFilter, categoryFilter, tasks, timeSensitiveOnly, view]);

  async function completeTask(task: Task) {
    setBusyTaskId(task.id);
    setRecentlyCompletedId(task.id);
    try {
      await api(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: personHeaders(currentPersonId),
      });
      await refresh();
      window.setTimeout(() => setRecentlyCompletedId(null), 900);
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function reopenTask(task: Task) {
    setBusyTaskId(task.id);
    try {
      await api(`/api/tasks/${task.id}/reopen`, {
        method: "POST",
        headers: personHeaders(currentPersonId),
      });
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function archiveTask(task: Task) {
    setBusyTaskId(task.id);
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...personHeaders(currentPersonId),
        },
        body: JSON.stringify({ status: "archived" }),
      });
      setSelectedTaskId(null);
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function planTask(task: Task, plannedFor: string | null) {
    setBusyTaskId(task.id);
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...personHeaders(currentPersonId),
        },
        body: JSON.stringify({ plannedFor }),
      });
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyTaskId(null);
    }
  }

  if (!bootstrap) {
    return (
      <main className="homie-shell loading-shell">
        <div className="brand-lockup">
          <span className="app-mark">H</span>
          <div>
            <h1>Homie</h1>
            <p>Loading the house board</p>
          </div>
        </div>
      </main>
    );
  }

  const selectablePeople = bootstrap.people.filter((person) => person.slug !== "unassigned");
  const scopeOptions = [...selectablePeople.map((person) => person.id), "all"];
  const currentPerson = selectablePeople.find((person) => person.id === currentPersonId) ?? selectablePeople[0];
  const personScope = personScopeId === "all" ? null : selectablePeople.find((person) => person.id === personScopeId) ?? currentPerson;
  const cyclePersonScope = () => {
    const currentIndex = scopeOptions.indexOf(personScopeId);
    const nextScope = scopeOptions[(currentIndex + 1) % scopeOptions.length] ?? currentPerson.id;
    setPersonScopeId(nextScope);
    if (nextScope !== "all") {
      setCurrentPersonId(nextScope);
    }
  };

  return (
    <main className="homie-shell">
      <section className={clsx("app-hero", view === "add" && "is-compact")}>
        <header className="top-bar">
          <div className="brand-lockup">
            <h1>Homie</h1>
          </div>
        </header>

        {view !== "add" ? (
          <nav className="mode-tabs" aria-label="Main navigation">
            <NavButton icon={<CalendarClock size={18} />} label="Today" active={view === "today"} onClick={() => setView("today")} />
            <NavButton icon={<CalendarDays size={18} />} label="Week" active={view === "week"} onClick={() => setView("week")} />
            <NavButton icon={<ListFilter size={18} />} label="All" active={view === "all"} onClick={() => setView("all")} />
            <NavButton icon={<ClipboardCheck size={18} />} label="Done" active={view === "done"} onClick={() => setView("done")} />
          </nav>
        ) : null}
      </section>

      {view === "today" || view === "week" ? (
        <div className="person-switch" role="group" aria-label="Owner filter">
          <span>Showing</span>
          <button className="person-picker" type="button" onClick={cyclePersonScope} aria-label="Cycle owner filter">
            {personScope ? personScope.name : "All"}
          </button>
        </div>
      ) : null}

      {error ? (
        <section className="error-band" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            <X size={18} />
          </button>
        </section>
      ) : null}

      {view === "add" ? (
        <AddTaskPanel
          bootstrap={bootstrap}
          currentPersonId={currentPersonId}
          onCancel={() => setView("today")}
          onCreated={async () => {
            setSelectedTaskId(null);
            setView("today");
            await refresh();
          }}
          onError={setError}
        />
      ) : view === "today" ? (
        <TodayPlan
          tasks={tasks}
          todayKey={todayKey}
          assigneeScopeId={personScopeId}
          busyTaskId={busyTaskId}
          recentlyCompletedId={recentlyCompletedId}
          onOpen={(task) => setSelectedTaskId(task.id)}
          onComplete={completeTask}
          onReopen={reopenTask}
        />
      ) : view === "week" ? (
        <WeekPlan
          tasks={tasks}
          days={planningDays}
          assigneeScopeId={personScopeId}
          busyTaskId={busyTaskId}
          recentlyCompletedId={recentlyCompletedId}
          onOpen={(task) => setSelectedTaskId(task.id)}
          onComplete={completeTask}
          onReopen={reopenTask}
        />
      ) : (
        <>
          <section className="view-head">
            <div>
              <p className="eyebrow">{view === "done" ? "Recent wins" : "All tasks"}</p>
              <h2>{viewTitle(view, visibleTasks.length)}</h2>
            </div>
            {view === "all" ? (
              <button
                className={clsx("icon-toggle", timeSensitiveOnly && "is-on")}
                type="button"
                onClick={() => setTimeSensitiveOnly((value) => !value)}
                aria-label="Filter time-sensitive tasks"
              >
                <CalendarClock size={20} />
              </button>
            ) : null}
          </section>

          {view === "all" ? (
            <section className="filter-strip" aria-label="Task filters">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Category filter">
                <option value="all">All categories</option>
                {bootstrap.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} aria-label="Assignee filter">
                <option value="all">Everyone</option>
                {bootstrap.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          <section className="task-stack" aria-label="Tasks">
            {visibleTasks.length ? (
              visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={busyTaskId === task.id}
                  justCompleted={recentlyCompletedId === task.id}
                  onOpen={() => setSelectedTaskId(task.id)}
                  onComplete={() => completeTask(task)}
                  onReopen={() => reopenTask(task)}
                />
              ))
            ) : (
              <EmptyState view={view} />
            )}
          </section>
        </>
      )}

      {selectedTask ? (
        <TaskDetailSheet
          bootstrap={bootstrap}
          task={selectedTask}
          currentPersonId={currentPersonId}
          busy={busyTaskId === selectedTask.id}
          onClose={() => setSelectedTaskId(null)}
          onArchive={() => archiveTask(selectedTask)}
          onPlan={(plannedFor) => planTask(selectedTask, plannedFor)}
          onRefresh={refresh}
          onError={setError}
        />
      ) : null}

      {view !== "add" ? (
        <button className="floating-add" type="button" onClick={() => setView("add")} aria-label="Add task">
          <Plus size={28} />
        </button>
      ) : null}
    </main>
  );
}

function WeekPlan({
  tasks,
  days,
  assigneeScopeId,
  busyTaskId,
  recentlyCompletedId,
  onOpen,
  onComplete,
  onReopen,
}: {
  tasks: Task[];
  days: PlanningDay[];
  assigneeScopeId: string;
  busyTaskId: string | null;
  recentlyCompletedId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
}) {
  const openTasks = filterByAssigneeScope(tasks.filter(isOpenTask), assigneeScopeId);
  const plannedThisWeek = openTasks.filter((task) => task.plannedFor && days.some((day) => day.value === task.plannedFor));
  const weekStart = days[0]?.value;
  const weekEnd = days[days.length - 1]?.value;
  const dueThisWeek =
    weekStart && weekEnd
      ? openTasks.filter((task) => !task.plannedFor && task.dueAt && isDateKeyInRange(dueDateKey(task.dueAt), weekStart, weekEnd))
      : [];
  const weekCount = plannedThisWeek.length + dueThisWeek.length;
  const plannedDays = days
    .map((day) => ({
      day,
      tasks: openTasks.filter((task) => task.plannedFor === day.value),
    }))
    .filter((item) => item.tasks.length > 0);

  return (
    <>
      <section className="view-head">
        <div>
          <p className="eyebrow">Week</p>
          <h2>{weekCount ? `${weekCount} scheduled or due` : "Nada"}</h2>
        </div>
      </section>

      <section className="board-sections" aria-label="Next 7 days">
        <section className="board-section" aria-label="Scheduled">
          <SectionHeader title="Scheduled" count={plannedThisWeek.length} />
          {plannedDays.length ? (
            <div className="week-plan">
              {plannedDays.map(({ day, tasks: dayTasks }) => (
                <article className="week-day-card" key={day.value} data-testid="week-day-card">
                  <header className="week-day-head">
                    <div>
                      <p className="eyebrow">{day.monthDay}</p>
                      <h3>{day.label}</h3>
                    </div>
                    <span className="week-count">{dayTasks.length}</span>
                  </header>
                  <div className="task-stack compact-stack">
                    {dayTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        busy={busyTaskId === task.id}
                        justCompleted={recentlyCompletedId === task.id}
                        onOpen={() => onOpen(task)}
                        onComplete={() => onComplete(task)}
                        onReopen={() => onReopen(task)}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <SectionEmpty icon={<CalendarDays size={28} />} text="Nothing scheduled this week." />
          )}
        </section>

        <TaskGroupSection
          title="Due"
          tasks={dueThisWeek}
          emptyText="Nothing due this week."
          emptyIcon={<Inbox size={26} />}
          busyTaskId={busyTaskId}
          recentlyCompletedId={recentlyCompletedId}
          onOpen={onOpen}
          onComplete={onComplete}
          onReopen={onReopen}
        />
      </section>
    </>
  );
}

function TodayPlan({
  tasks,
  todayKey,
  assigneeScopeId,
  busyTaskId,
  recentlyCompletedId,
  onOpen,
  onComplete,
  onReopen,
}: {
  tasks: Task[];
  todayKey: string;
  assigneeScopeId: string;
  busyTaskId: string | null;
  recentlyCompletedId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
}) {
  const openTasks = filterByAssigneeScope(tasks.filter(isOpenTask), assigneeScopeId);
  const scheduledToday = openTasks.filter((task) => task.plannedFor === todayKey);
  const dueToday = openTasks.filter((task) => !task.plannedFor && task.dueAt && dueDateKey(task.dueAt) <= todayKey);
  const todayCount = scheduledToday.length + dueToday.length;

  return (
    <>
      <section className="view-head">
        <div>
          <p className="eyebrow">Today</p>
          <h2>{todayCount ? `${todayCount} scheduled or due` : "Nada"}</h2>
        </div>
      </section>

      <section className="board-sections" aria-label="Today tasks">
        <TaskGroupSection
          title="Scheduled"
          tasks={scheduledToday}
          emptyText="Nothing scheduled today."
          emptyIcon={<CalendarClock size={26} />}
          busyTaskId={busyTaskId}
          recentlyCompletedId={recentlyCompletedId}
          onOpen={onOpen}
          onComplete={onComplete}
          onReopen={onReopen}
        />
        <TaskGroupSection
          title="Due"
          tasks={dueToday}
          emptyText="Nothing due today."
          emptyIcon={<Inbox size={26} />}
          busyTaskId={busyTaskId}
          recentlyCompletedId={recentlyCompletedId}
          onOpen={onOpen}
          onComplete={onComplete}
          onReopen={onReopen}
        />
      </section>
    </>
  );
}

function TaskGroupSection({
  title,
  tasks,
  emptyText,
  emptyIcon,
  busyTaskId,
  recentlyCompletedId,
  onOpen,
  onComplete,
  onReopen,
}: {
  title: string;
  tasks: Task[];
  emptyText: string;
  emptyIcon: ReactNode;
  busyTaskId: string | null;
  recentlyCompletedId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
}) {
  return (
    <section className="board-section" aria-label={title}>
      <SectionHeader title={title} count={tasks.length} />
      {tasks.length ? (
        <div className="task-stack">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={busyTaskId === task.id}
              justCompleted={recentlyCompletedId === task.id}
              onOpen={() => onOpen(task)}
              onComplete={() => onComplete(task)}
              onReopen={() => onReopen(task)}
            />
          ))}
        </div>
      ) : (
        <SectionEmpty icon={emptyIcon} text={emptyText} />
      )}
    </section>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <header className="board-section-head">
      <h3>{title}</h3>
      <span>{count}</span>
    </header>
  );
}

function SectionEmpty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="section-empty">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}

function AddTaskPanel({
  bootstrap,
  currentPersonId,
  onCancel,
  onCreated,
  onError,
}: {
  bootstrap: Bootstrap;
  currentPersonId: string;
  onCancel: () => void;
  onCreated: (task: Task) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("cat_house");
  const [assigneeId, setAssigneeId] = useState(currentPersonId);
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [dueAt, setDueAt] = useState("");
  const [repeats, setRepeats] = useState(false);
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [repeatFrequency, setRepeatFrequency] = useState<RecurrenceFrequency>("weekly");
  const [repeatEnds, setRepeatEnds] = useState(false);
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const recurrenceAnchor = dueAt || dateKey(new Date());
      const task = await api<Task>("/api/tasks", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...personHeaders(currentPersonId),
        },
        body: JSON.stringify({
          title,
          description,
          categoryId,
          assigneeId,
          priority,
          dueAt: dueAt ? localDateToIso(dueAt) : repeats ? localDateToIso(recurrenceAnchor) : null,
          createdById: currentPersonId,
          recurrence: repeats
            ? {
                frequency: repeatFrequency,
                interval: repeatEvery,
                anchorDate: localDateToIso(recurrenceAnchor),
                endDate: repeatEnds && repeatEndDate ? repeatEndDate : null,
              }
            : undefined,
        }),
      });

      if (files.length) {
        const formData = new FormData();
        files.forEach((file) => formData.append("photos", file));
        await api(`/api/tasks/${task.id}/photos`, {
          method: "POST",
          headers: personHeaders(currentPersonId),
          body: formData,
        });
      }

      setTitle("");
      setDescription("");
      setCategoryId("cat_house");
      setAssigneeId(currentPersonId);
      setPriority("normal");
      setDueAt("");
      setRepeats(false);
      setRepeatEvery(1);
      setRepeatFrequency("weekly");
      setRepeatEnds(false);
      setRepeatEndDate("");
      setFiles([]);
      await onCreated(task);
    } catch (nextError) {
      onError((nextError as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-panel" onSubmit={submit}>
      <section className="view-head">
        <div>
          <p className="eyebrow">New task</p>
          <h2>What needs doing?</h2>
        </div>
        <button className="icon-toggle" type="button" onClick={onCancel} aria-label="Close composer">
          <X size={20} />
        </button>
      </section>

      <section className="quick-create-card">
        <label className="field-block task-title-field">
          <span>Task</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Take wood pile to the dump"
            required
            maxLength={160}
            autoFocus
          />
        </label>

        <label className="field-block">
          <span>Note</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional context"
            rows={3}
            maxLength={4000}
          />
        </label>

        <section className="photo-section" aria-label="Photos">
          <span className="section-label">Photos</span>
          <div className="photo-pickers">
            <label className="photo-button">
              <Camera size={20} />
              <span>Camera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(event) => setFiles(addFiles(files, event.currentTarget.files))}
              />
            </label>
            <label className="photo-button">
              <ImagePlus size={20} />
              <span>Roll</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setFiles(addFiles(files, event.currentTarget.files))}
              />
            </label>
          </div>

          {files.length ? (
            <div className="file-row" aria-label="Selected photos">
              {files.map((file, index) => (
                <span key={`${file.name}-${index}`}>{file.name}</span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="details-section" aria-label="Details">
          <span className="section-label">Details</span>

          <div className="field-grid">
            <label className="field-block">
              <span>Category</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {bootstrap.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-block">
              <span>For</span>
              <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                {bootstrap.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="priority-field">
            <span className="section-label">Priority</span>
            <div className="priority-row" aria-label="Priority">
              {(["low", "normal", "high", "urgent"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={clsx("priority-chip", `priority-${value}`, priority === value && "is-selected")}
                  onClick={() => setPriority(value)}
                >
                  {priorityLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <label className="field-block">
            <span>Due</span>
            <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>

          <section className="repeat-editor" aria-label="Repeat">
            <label className="repeat-toggle">
              <input type="checkbox" checked={repeats} onChange={(event) => setRepeats(event.target.checked)} />
              <span>Repeat</span>
            </label>
            {repeats ? (
              <div className="repeat-controls">
                <label className="field-block">
                  <span>Every</span>
                  <input type="number" min="1" max="365" value={repeatEvery} onChange={(event) => setRepeatEvery(Number(event.target.value) || 1)} />
                </label>
                <label className="field-block">
                  <span>Unit</span>
                  <select value={repeatFrequency} onChange={(event) => setRepeatFrequency(event.target.value as RecurrenceFrequency)}>
                    <option value="daily">Days</option>
                    <option value="weekly">Weeks</option>
                    <option value="monthly">Months</option>
                  </select>
                </label>
                <label className="repeat-toggle">
                  <input type="checkbox" checked={repeatEnds} onChange={(event) => setRepeatEnds(event.target.checked)} />
                  <span>Ends</span>
                </label>
                {repeatEnds ? (
                  <label className="field-block">
                    <span>End date</span>
                    <input type="date" value={repeatEndDate} onChange={(event) => setRepeatEndDate(event.target.value)} />
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>
        </section>

        <button className="primary-action" type="submit" disabled={submitting || !title.trim()}>
          <Plus size={20} />
          <span>{submitting ? "Adding" : "Add task"}</span>
        </button>
      </section>
    </form>
  );
}

function TaskCard({
  task,
  busy,
  justCompleted,
  onOpen,
  onComplete,
  onReopen,
}: {
  task: Task;
  busy: boolean;
  justCompleted: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onReopen: () => void;
}) {
  const done = task.status === "done";
  return (
    <article className={clsx("task-card", justCompleted && "just-completed")} data-testid="task-card">
      <button
        className={clsx("complete-button", done && "is-done")}
        type="button"
        disabled={busy}
        onClick={done ? onReopen : onComplete}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
      >
        {done ? <Check size={22} /> : <Circle size={22} />}
      </button>
      <button className="task-main" type="button" onClick={onOpen}>
        <span className="task-title">{task.title}</span>
        {task.description ? <span className="task-description">{task.description}</span> : null}
        <span className="task-meta">
          <span className="task-pill category-pill" style={{ borderColor: task.category.color, color: task.category.color }}>
            {task.category.name}
          </span>
          <span className="task-pill owner-pill">{task.assignee?.name ?? "Unassigned"}</span>
          {task.createdBy ? <span className="task-pill creator-pill">Added by {task.createdBy.name}</span> : null}
          <span className="task-pill timing-pill">{taskTimingLabel(task)}</span>
          <span className={clsx("task-pill", "priority-pill", `task-priority-${task.priority}`)}>{priorityLabels[task.priority]}</span>
          {task.recurringRule?.isActive ? (
            <span className="task-pill repeat-pill">
              <Repeat2 size={12} />
              {recurrenceLabel(task.recurringRule)}
            </span>
          ) : null}
        </span>
      </button>
      {task.photos.length ? (
        <div className="thumb-strip" aria-label="Task photos">
          {task.photos.slice(0, 3).map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photo.id} src={`/api/photos/${photo.id}`} alt="" />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function TaskDetailSheet({
  bootstrap,
  task,
  currentPersonId,
  busy: parentBusy,
  onClose,
  onArchive,
  onPlan,
  onRefresh,
  onError,
}: {
  bootstrap: Bootstrap;
  task: Task;
  currentPersonId: string;
  busy: boolean;
  onClose: () => void;
  onArchive: () => Promise<void>;
  onPlan: (plannedFor: string | null) => Promise<void>;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [repeats, setRepeats] = useState(Boolean(task.recurringRule?.isActive));
  const [repeatEvery, setRepeatEvery] = useState(task.recurringRule?.interval ?? 1);
  const [repeatFrequency, setRepeatFrequency] = useState<RecurrenceFrequency>(task.recurringRule?.frequency ?? "weekly");
  const [repeatEnds, setRepeatEnds] = useState(Boolean(task.recurringRule?.endDate));
  const [repeatEndDate, setRepeatEndDate] = useState(task.recurringRule?.endDate ?? "");

  async function updateTask(
    patch: Partial<Pick<Task, "categoryId" | "assigneeId" | "priority" | "dueAt">> & {
      recurrence?:
        | {
            frequency: RecurrenceFrequency;
            interval: number;
            anchorDate: string;
            endDate: string | null;
          }
        | null;
    },
  ) {
    setBusy(true);
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...personHeaders(currentPersonId),
        },
        body: JSON.stringify(patch),
      });
      await onRefresh();
    } catch (nextError) {
      onError((nextError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRecurrence(
    nextRepeats = repeats,
    overrides: Partial<{ frequency: RecurrenceFrequency; interval: number; ends: boolean; endDate: string }> = {},
  ) {
    const anchorDate = task.dueAt ? dateKey(new Date(task.dueAt)) : dateKey(new Date());
    const nextEnds = overrides.ends ?? repeatEnds;
    const nextEndDate = overrides.endDate ?? repeatEndDate;
    if (!nextRepeats) {
      await updateTask({ recurrence: null });
      return;
    }

    await updateTask({
      dueAt: task.dueAt ?? localDateToIso(anchorDate),
      recurrence: {
        frequency: overrides.frequency ?? repeatFrequency,
        interval: overrides.interval ?? repeatEvery,
        anchorDate: localDateToIso(anchorDate),
        endDate: nextEnds && nextEndDate ? nextEndDate : null,
      },
    });
  }

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api(`/api/tasks/${task.id}/notes`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...personHeaders(currentPersonId),
        },
        body: JSON.stringify({ body: note, authorPersonId: currentPersonId }),
      });
      setNote("");
      await onRefresh();
    } catch (nextError) {
      onError((nextError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-backdrop" aria-label="Task detail">
      <div className="detail-sheet">
        <header className="detail-header">
          <div>
            <p className="eyebrow">{task.category.name}</p>
            <h2>{task.title}</h2>
          </div>
          <button className="icon-toggle" type="button" onClick={onClose} aria-label="Close task detail">
            <X size={20} />
          </button>
        </header>

        <div className="detail-chips">
          <span className={clsx("priority-chip", `priority-${task.priority}`, "is-selected")}>{priorityLabels[task.priority]}</span>
          <span>{task.assignee?.name ?? "Unassigned"}</span>
          {task.createdBy ? <span>Added by {task.createdBy.name}</span> : null}
          {task.plannedFor ? <span>{plannedLabel(task.plannedFor)}</span> : null}
          <span>{urgencyLabels[task.urgency]}</span>
          {task.dueAt ? <span>Due {formatDueDate(task.dueAt)}</span> : null}
          {task.recurringRule?.isActive ? (
            <span className="repeat-chip">
              <Repeat2 size={13} />
              {recurrenceLabel(task.recurringRule)}
            </span>
          ) : null}
        </div>

        <details className="plan-box" aria-label="Plan this task" open={Boolean(task.plannedFor)}>
          <summary>
            <CalendarDays size={18} />
            <span>{task.plannedFor ? plannedLabel(task.plannedFor) : "Plan for a day"}</span>
          </summary>
          <div className="plan-chip-row">
            {nextSevenDays().map((day) => (
              <button
                key={day.value}
                className={clsx("plan-chip", task.plannedFor === day.value && "is-selected")}
                type="button"
                onClick={() => onPlan(day.value)}
                disabled={busy || parentBusy}
                aria-label={`Plan ${task.title} for ${day.label}`}
              >
                <span>{day.shortLabel}</span>
                <small>{day.monthDay}</small>
              </button>
            ))}
            {task.plannedFor ? (
              <button
                className="plan-chip is-clear"
                type="button"
                onClick={() => onPlan(null)}
                disabled={busy || parentBusy}
                aria-label={`Clear plan for ${task.title}`}
              >
                <span>Clear</span>
                <small>plan</small>
              </button>
            ) : null}
          </div>
        </details>

        <section className="edit-panel" aria-label="Edit task details">
          <div className="field-grid">
            <label className="field-block">
              <span>Category</span>
              <select value={task.categoryId} onChange={(event) => updateTask({ categoryId: event.target.value })} disabled={busy || parentBusy}>
                {bootstrap.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-block">
              <span>For</span>
              <select value={task.assigneeId ?? "person_unassigned"} onChange={(event) => updateTask({ assigneeId: event.target.value })} disabled={busy || parentBusy}>
                {bootstrap.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="priority-field">
            <span className="section-label">Priority</span>
            <div className="priority-row" aria-label="Edit priority">
              {(["low", "normal", "high", "urgent"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={clsx("priority-chip", `priority-${value}`, task.priority === value && "is-selected")}
                  onClick={() => updateTask({ priority: value })}
                  disabled={busy || parentBusy}
                >
                  {priorityLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <label className="field-block">
            <span>Due</span>
            <input
              type="date"
              value={task.dueAt ? dateKey(new Date(task.dueAt)) : ""}
              onChange={(event) => updateTask({ dueAt: event.target.value ? localDateToIso(event.target.value) : null })}
              disabled={busy || parentBusy}
            />
          </label>

          <section className="repeat-editor" aria-label="Repeat">
            <label className="repeat-toggle">
              <input
                type="checkbox"
                checked={repeats}
                onChange={(event) => {
                  setRepeats(event.target.checked);
                  saveRecurrence(event.target.checked);
                }}
                disabled={busy || parentBusy}
              />
              <span>Repeat</span>
            </label>
            {repeats ? (
              <div className="repeat-controls">
                <label className="field-block">
                  <span>Every</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={repeatEvery}
                    onChange={(event) => setRepeatEvery(Number(event.target.value) || 1)}
                    onBlur={() => saveRecurrence(true)}
                    disabled={busy || parentBusy}
                  />
                </label>
                <label className="field-block">
                  <span>Unit</span>
                  <select
                    value={repeatFrequency}
                    onChange={(event) => {
                      const nextFrequency = event.target.value as RecurrenceFrequency;
                      setRepeatFrequency(nextFrequency);
                      saveRecurrence(true, { frequency: nextFrequency });
                    }}
                    disabled={busy || parentBusy}
                  >
                    <option value="daily">Days</option>
                    <option value="weekly">Weeks</option>
                    <option value="monthly">Months</option>
                  </select>
                </label>
                <label className="repeat-toggle">
                  <input
                    type="checkbox"
                    checked={repeatEnds}
                    onChange={(event) => {
                      setRepeatEnds(event.target.checked);
                      if (!event.target.checked) {
                        setRepeatEndDate("");
                        saveRecurrence(true, { ends: false, endDate: "" });
                      }
                    }}
                    disabled={busy || parentBusy}
                  />
                  <span>Ends</span>
                </label>
                {repeatEnds ? (
                  <label className="field-block">
                    <span>End date</span>
                    <input
                      type="date"
                      value={repeatEndDate}
                      onChange={(event) => setRepeatEndDate(event.target.value)}
                      onBlur={() => saveRecurrence(true, { endDate: repeatEndDate })}
                      disabled={busy || parentBusy}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>
        </section>

        {task.photos.length ? (
          <div className="photo-grid">
            {task.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo.id} src={`/api/photos/${photo.id}`} alt="" />
            ))}
          </div>
        ) : null}

        {task.description ? <p className="detail-description">{task.description}</p> : null}

        <section className="notes-list">
          <h3>Notes</h3>
          {task.notes.length ? (
            task.notes.map((item) => (
              <p key={item.id}>
                <span>{noteAuthorLabel(item, bootstrap.people)}</span>
                {item.body}
              </p>
            ))
          ) : (
            <p className="muted">No notes yet.</p>
          )}
        </section>

        <form className="note-form" onSubmit={submitNote}>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note" maxLength={4000} />
          <button type="submit" disabled={busy || !note.trim()} aria-label="Send note">
            <Send size={18} />
          </button>
        </form>

        <button className="danger-action" type="button" onClick={onArchive} disabled={busy || parentBusy} aria-label="Remove task">
          <Trash2 size={18} />
          <span>{parentBusy ? "Removing" : "Remove from board"}</span>
        </button>
      </div>
    </section>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={clsx("nav-button", active && "is-active")} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EmptyState({ view }: { view: ViewMode }) {
  return (
    <section className="empty-state">
      {view === "done" ? <Undo2 size={26} /> : <Inbox size={26} />}
      <h3>{view === "done" ? "Nothing checked off yet" : "Clear for now"}</h3>
    </section>
  );
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}

function personHeaders(personId: string) {
  return {
    "x-homie-person-id": personId,
  };
}

function addFiles(existing: File[], next: FileList | null) {
  if (!next) return existing;
  return [...existing, ...Array.from(next)];
}

type PlanningDay = {
  value: string;
  label: string;
  shortLabel: string;
  monthDay: string;
  caption: string;
};

function isOpenTask(task: Task) {
  return task.status !== "done" && task.status !== "archived";
}

function filterByAssigneeScope(tasks: Task[], assigneeScopeId: string) {
  if (assigneeScopeId === "all") return tasks;
  return tasks.filter((task) => task.assigneeId === assigneeScopeId);
}

function noteAuthorLabel(note: TaskNote, people: Person[]) {
  if (note.authorType === "human") {
    return people.find((person) => person.id === note.authorPersonId)?.name ?? "Someone";
  }
  if (note.authorType === "agent") return note.agentName ?? "Agent";
  return "System";
}

function nextSevenDays(now = new Date()): PlanningDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    date.setHours(12, 0, 0, 0);
    const label = index === 0 ? "Today" : index === 1 ? "Tomorrow" : weekdayName(date, "long");
    return {
      value: dateKey(date),
      label,
      shortLabel: index === 0 ? "Today" : index === 1 ? "Tmrw" : weekdayName(date, "short"),
      monthDay: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
      caption: index === 0 ? "Start here" : index === 1 ? "Next up" : "Planned day",
    };
  });
}

function dateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dueDateKey(value: string) {
  return dateKey(new Date(value));
}

function localDateToIso(value: string) {
  return new Date(`${value}T12:00:00`).toISOString();
}

function isDateKeyInRange(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

function weekdayName(date: Date, weekday: "short" | "long") {
  return new Intl.DateTimeFormat(undefined, { weekday }).format(date);
}

function addLocalDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function plannedLabel(value: string) {
  const today = dateKey(new Date());
  const tomorrow = dateKey(addLocalDays(new Date(), 1));
  if (value === today) return "Planned today";
  if (value === tomorrow) return "Planned tomorrow";
  return `Planned ${weekdayName(new Date(`${value}T12:00:00`), "short")}`;
}

function taskTimingLabel(task: Task) {
  if (task.plannedFor) return plannedLabel(task.plannedFor);
  if (task.dueAt) return `Due ${formatDueDate(task.dueAt)}`;
  return urgencyLabels[task.urgency];
}

function recurrenceLabel(rule: NonNullable<Task["recurringRule"]>) {
  if (rule.frequency === "daily") return rule.interval === 1 ? "Daily" : `Every ${rule.interval} days`;
  if (rule.frequency === "weekly") return rule.interval === 1 ? "Weekly" : `Every ${rule.interval} weeks`;
  if (rule.frequency === "monthly") return rule.interval === 1 ? "Monthly" : `Every ${rule.interval} months`;
  return `Every ${rule.interval} days`;
}

function viewTitle(view: ViewMode, count: number) {
  if (view === "today") return count ? `${count} scheduled or due` : "Nada";
  if (view === "done") return count ? `${count} checked off` : "Fresh slate";
  if (view === "week") return count ? `${count} scheduled or due` : "Nada";
  return `${count} open tasks`;
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
