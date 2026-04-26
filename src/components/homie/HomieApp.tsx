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
  MessageSquare,
  Plus,
  Scissors,
  Send,
  Settings,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
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
  categoryId: string;
  assignee: Person | null;
  category: Category;
  photos: TaskPhoto[];
  notes: TaskNote[];
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [timeSensitiveOnly, setTimeSensitiveOnly] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [recentlyCompletedId, setRecentlyCompletedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const planningDays = useMemo(() => nextSevenDays(), []);

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

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (view === "done") return task.status === "done";
      if (view === "today") return task.status !== "done" && task.urgency !== "normal";
      if (view === "add" || view === "week") return false;
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

  const stats = taskStats(tasks);

  return (
    <main className="homie-shell">
      <section className={clsx("app-hero", view === "add" && "is-compact")}>
        <header className="top-bar">
          <button className="ghost-icon" type="button" aria-label="Settings">
            <Settings size={24} />
          </button>
          <div className="brand-lockup">
            <span className="app-mark">H</span>
            <div>
              <h1>Homie</h1>
              <p>{summaryLine(tasks)}</p>
            </div>
          </div>
          <button className="ghost-icon" type="button" aria-label="Messages">
            <MessageSquare size={24} />
          </button>
        </header>

        {view !== "add" ? (
          <nav className="mode-tabs" aria-label="Main navigation">
            <NavButton icon={<CalendarClock size={18} />} label="Today" active={view === "today"} onClick={() => setView("today")} />
            <NavButton icon={<CalendarDays size={18} />} label="Week" active={view === "week"} onClick={() => setView("week")} />
            <NavButton icon={<ListFilter size={18} />} label="All" active={view === "all"} onClick={() => setView("all")} />
            <NavButton icon={<ClipboardCheck size={18} />} label="Done" active={view === "done"} onClick={() => setView("done")} />
          </nav>
        ) : null}

        {view !== "add" ? (
          <section className="pulse-card" aria-label="House pulse">
            <div>
              <strong>{stats.open}</strong>
              <span>open</span>
            </div>
            <div className="task-ring" style={{ "--ring-value": `${stats.doneShare}%` } as CSSProperties}>
              <span>{stats.doneShare}%</span>
            </div>
            <div>
              <strong>{stats.timeSensitive}</strong>
              <span>needs eyes</span>
            </div>
          </section>
        ) : null}
      </section>

      <label className="person-switch">
        <span>Acting as</span>
        <select value={currentPersonId} onChange={(event) => setCurrentPersonId(event.target.value)}>
          {bootstrap.people
            .filter((person) => person.slug !== "unassigned")
            .map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
        </select>
      </label>

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
          onCreated={async (task) => {
            setSelectedTaskId(task.id);
            setView("today");
            await refresh();
          }}
          onError={setError}
        />
      ) : view === "week" ? (
        <WeekPlan
          tasks={tasks}
          days={planningDays}
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
              <p className="eyebrow">{view === "today" ? "Time sensitive" : view === "done" ? "Recent wins" : "All tasks"}</p>
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
          task={selectedTask}
          currentPersonId={currentPersonId}
          busy={busyTaskId === selectedTask.id}
          planningDays={planningDays}
          onClose={() => setSelectedTaskId(null)}
          onArchive={() => archiveTask(selectedTask)}
          onPlan={(plannedFor) => planTask(selectedTask, plannedFor)}
          onRefresh={refresh}
          onError={setError}
        />
      ) : null}

      {view !== "add" ? (
        <button className="floating-add" type="button" onClick={() => setView("add")} aria-label="Add task">
          <Camera size={20} />
          <Plus size={26} />
        </button>
      ) : null}
    </main>
  );
}

function WeekPlan({
  tasks,
  days,
  busyTaskId,
  recentlyCompletedId,
  onOpen,
  onComplete,
  onReopen,
}: {
  tasks: Task[];
  days: PlanningDay[];
  busyTaskId: string | null;
  recentlyCompletedId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
}) {
  const openTasks = tasks.filter(isOpenTask);
  const plannedThisWeek = openTasks.filter((task) => task.plannedFor && days.some((day) => day.value === task.plannedFor));
  const unplanned = openTasks.filter((task) => !task.plannedFor).slice(0, 5);

  return (
    <>
      <section className="view-head">
        <div>
          <p className="eyebrow">Next 7 days</p>
          <h2>{plannedThisWeek.length ? `${plannedThisWeek.length} planned this week` : "A fresh week to shape"}</h2>
        </div>
      </section>

      <section className="week-plan" aria-label="Next 7 days">
        {days.map((day) => {
          const dayTasks = openTasks.filter((task) => task.plannedFor === day.value);
          return (
            <article className="week-day-card" key={day.value} data-testid="week-day-card">
              <header className="week-day-head">
                <div>
                  <p className="eyebrow">{day.caption}</p>
                  <h3>{day.label}</h3>
                </div>
                <span className="week-count">{dayTasks.length}</span>
              </header>
              {dayTasks.length ? (
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
              ) : (
                <p className="week-empty">Open day. Nothing promised yet.</p>
              )}
            </article>
          );
        })}
      </section>

      {unplanned.length ? (
        <section className="planning-backlog" aria-label="Unplanned tasks">
          <div>
            <p className="eyebrow">Still unplanned</p>
            <h3>Pick a task, then choose a day.</h3>
          </div>
          <div className="task-stack compact-stack">
            {unplanned.map((task) => (
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
        </section>
      ) : null}
    </>
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
  const [assigneeId, setAssigneeId] = useState("person_unassigned");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [dueAt, setDueAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
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
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          createdById: currentPersonId,
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
      setPriority("normal");
      setDueAt("");
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
          <h2>Add to the house board</h2>
        </div>
        <button className="icon-toggle" type="button" onClick={onCancel} aria-label="Close add task">
          <X size={20} />
        </button>
      </section>

      <label className="field-block">
        <span>Title</span>
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
        <span>Notes</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Gate code, rough size, where it is, anything useful"
          rows={4}
          maxLength={4000}
        />
      </label>

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
          <span>Assignee</span>
          <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {bootstrap.people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
      </div>

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

      <label className="field-block">
        <span>Due</span>
        <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      </label>

      <button className="primary-action" type="submit" disabled={submitting}>
        <Plus size={20} />
        <span>{submitting ? "Adding" : "Add task"}</span>
      </button>
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
    <article className={clsx("task-card", `urgency-${task.urgency}`, justCompleted && "just-completed")} data-testid="task-card">
      <span className="task-marker" style={{ backgroundColor: task.category.color }} />
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
          <span className="category-dot" style={{ backgroundColor: task.category.color }} />
          <span>{task.category.name}</span>
          <span>{task.assignee?.name ?? "Unassigned"}</span>
          {task.plannedFor ? <span>{plannedLabel(task.plannedFor)}</span> : null}
          <span>{urgencyLabels[task.urgency]}</span>
        </span>
        <span className="task-meter">
          <span className={`meter-fill priority-fill-${task.priority}`} />
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
  task,
  currentPersonId,
  busy: parentBusy,
  planningDays,
  onClose,
  onArchive,
  onPlan,
  onRefresh,
  onError,
}: {
  task: Task;
  currentPersonId: string;
  busy: boolean;
  planningDays: PlanningDay[];
  onClose: () => void;
  onArchive: () => Promise<void>;
  onPlan: (plannedFor: string | null) => Promise<void>;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [note, setNote] = useState("");
  const [splitText, setSplitText] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function splitTask() {
    const titles = splitText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (titles.length < 2) return;
    setBusy(true);
    try {
      await api(`/api/tasks/${task.id}/split`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...personHeaders(currentPersonId),
        },
        body: JSON.stringify({ titles }),
      });
      setSplitText("");
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
          {task.plannedFor ? <span>{plannedLabel(task.plannedFor)}</span> : null}
          <span>{urgencyLabels[task.urgency]}</span>
          {task.dueAt ? <span>{formatDue(task.dueAt)}</span> : null}
        </div>

        <section className="plan-box" aria-label="Plan this task">
          <div>
            <CalendarDays size={18} />
            <h3>Plan this</h3>
            <p>{task.plannedFor ? `Currently ${plannedLabel(task.plannedFor).toLowerCase()}` : "Choose the day this will actually happen."}</p>
          </div>
          <div className="plan-chip-row">
            {planningDays.map((day) => (
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
                <span>{item.agentName ?? "House"}</span>
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

        <section className="split-box">
          <div>
            <Scissors size={18} />
            <h3>Split</h3>
          </div>
          <textarea
            value={splitText}
            onChange={(event) => setSplitText(event.target.value)}
            placeholder={"First smaller task\nSecond smaller task"}
            rows={3}
          />
          <button type="button" onClick={splitTask} disabled={busy || splitText.split("\n").filter((line) => line.trim()).length < 2}>
            Split task
          </button>
        </section>

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

function summaryLine(tasks: Task[]) {
  const urgent = tasks.filter((task) => task.status !== "done" && ["urgent", "overdue", "today"].includes(task.urgency)).length;
  const open = tasks.filter((task) => task.status !== "done").length;
  return urgent ? `${urgent} needs eyes, ${open} open` : `${open} open tasks`;
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

function taskStats(tasks: Task[]) {
  const open = tasks.filter((task) => task.status !== "done" && task.status !== "archived");
  const done = tasks.filter((task) => task.status === "done");
  const timeSensitive = open.filter((task) => task.urgency !== "normal");
  const total = open.length + done.length;
  const doneShare = total ? Math.round((done.length / total) * 100) : 0;
  return {
    open: open.length,
    done: done.length,
    timeSensitive: timeSensitive.length,
    doneShare,
  };
}

function viewTitle(view: ViewMode, count: number) {
  if (view === "today") return count ? `${count} worth seeing now` : "No urgent house stuff";
  if (view === "done") return count ? `${count} checked off` : "Fresh slate";
  if (view === "week") return count ? `${count} planned` : "Shape the week";
  return `${count} open tasks`;
}

function formatDue(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
