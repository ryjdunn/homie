"use client";

import {
  CalendarDays,
  CalendarClock,
  Camera,
  Check,
  Circle,
  ClipboardCheck,
  Flag,
  FolderInput,
  ImagePlus,
  Inbox,
  Link2,
  ListFilter,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Send,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import type { FormEvent, PointerEvent as ReactPointerEvent, ReactNode, TouchEvent } from "react";
import { Fragment, startTransition, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { defaultThemeId, isHomieThemeId, themeOptions, type HomieThemeId } from "@/app/theme";

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

type AgentAnnotation = {
  id: string;
  agentName: string;
  kind: string;
  body: string;
  data: Record<string, unknown>;
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
  createdAt: string;
  updatedAt: string;
  assigneeId: string | null;
  createdById: string | null;
  categoryId: string;
  sortGroupId: string | null;
  sortGroupName: string | null;
  sortOrder: number;
  assignee: Person | null;
  createdBy: Person | null;
  category: Category;
  photos: TaskPhoto[];
  notes: TaskNote[];
  annotations: AgentAnnotation[];
  agentReview: {
    isFresh: boolean;
    agentName: string | null;
    reviewedAt: string | null;
  };
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

type ViewMode = "today" | "week" | "sort" | "all" | "add";

type SortUpdate = {
  id: string;
  sortGroupId: string | null;
  sortGroupName: string | null;
  sortOrder: number;
};

type DragPreview = {
  task: Task;
  x: number;
  y: number;
};

type GroupDragPreview = {
  name: string;
  count: number;
  x: number;
  y: number;
};

type SortDropPreview = {
  laneId: string;
  beforeTaskId: string | null;
  groupTaskId: string | null;
  mode: "insert" | "group";
};

type DragStartState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  started: boolean;
};

type ActivePointerEvent = {
  pointerId: number;
  clientX: number;
  clientY: number;
  preventDefault: () => void;
};

const GROUP_ORDER_STEP = 100000;
const TILE_ORDER_STEP = 1000;

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeId, setThemeId] = useState<HomieThemeId>(() => {
    if (typeof window === "undefined") return defaultThemeId;
    const remembered = window.localStorage.getItem("homie.themeId");
    return isHomieThemeId(remembered) ? remembered : defaultThemeId;
  });
  const pullStartY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);

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
    const syncSelectedTaskFromUrl = () => {
      const taskId = new URL(window.location.href).searchParams.get("task");
      setSelectedTaskId(taskId);
    };
    syncSelectedTaskFromUrl();
    window.addEventListener("popstate", syncSelectedTaskFromUrl);
    return () => window.removeEventListener("popstate", syncSelectedTaskFromUrl);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("homie.personId", currentPersonId);
  }, [currentPersonId]);

  useEffect(() => {
    window.localStorage.setItem("homie.personScopeId", personScopeId);
  }, [personScopeId]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    window.localStorage.setItem("homie.themeId", themeId);
  }, [themeId]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (view === "add" || view === "today" || view === "week") return false;
      if (view === "sort") return task.status !== "done" && task.status !== "archived";
      if (task.status === "done") return false;
      if (categoryFilter !== "all" && task.categoryId !== categoryFilter) return false;
      if (assigneeFilter !== "all" && task.assigneeId !== assigneeFilter) return false;
      if (timeSensitiveOnly && task.urgency === "normal") return false;
      return true;
    });
  }, [assigneeFilter, categoryFilter, tasks, timeSensitiveOnly, view]);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (task.status !== "done") return false;
        if (categoryFilter !== "all" && task.categoryId !== categoryFilter) return false;
        if (assigneeFilter !== "all" && task.assigneeId !== assigneeFilter) return false;
        return true;
      })
      .sort((first, second) => (second.completedAt ?? second.updatedAt).localeCompare(first.completedAt ?? first.updatedAt));
  }, [assigneeFilter, categoryFilter, tasks]);

  async function completeTask(task: Task) {
    setBusyTaskId(task.id);
    setRecentlyCompletedId(task.id);
    try {
      await Promise.all([
        api(`/api/tasks/${task.id}/complete`, {
          method: "POST",
          headers: personHeaders(currentPersonId),
        }),
        sleep(420),
      ]);
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
        body: JSON.stringify({
          status: "archived",
          ...(task.recurringRule?.isActive ? { recurrence: null } : {}),
        }),
      });
      setSelectedTaskId(null);
      syncTaskUrl(null, "replace");
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyTaskId(null);
    }
  }

  function openTaskDetail(taskId: string) {
    setSelectedTaskId(taskId);
    syncTaskUrl(taskId);
  }

  function closeTaskDetail() {
    setSelectedTaskId(null);
    syncTaskUrl(null);
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

  async function sortTasks(updates: SortUpdate[]) {
    if (!updates.length) return;
    setBusyTaskId(updates[0]?.id ?? null);
    try {
      await Promise.all(
        updates.map((update) =>
          api(`/api/tasks/${update.id}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              ...personHeaders(currentPersonId),
            },
            body: JSON.stringify({
              sortGroupId: update.sortGroupId,
              sortGroupName: update.sortGroupName,
              sortOrder: update.sortOrder,
            }),
          }),
        ),
      );
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setBusyTaskId(null);
    }
  }

  function beginPull(event: TouchEvent<HTMLElement>) {
    if (view === "add" || selectedTask || pullRefreshing || window.scrollY > 0) return;
    pullStartY.current = event.touches[0]?.clientY ?? null;
  }

  function movePull(event: TouchEvent<HTMLElement>) {
    if (pullStartY.current === null || selectedTask || window.scrollY > 0) return;
    const nextY = event.touches[0]?.clientY;
    if (typeof nextY !== "number") return;
    const delta = nextY - pullStartY.current;
    setPullDistance(delta > 0 ? Math.min(78, Math.round(delta * 0.55)) : 0);
  }

  async function endPull() {
    if (pullStartY.current === null) return;
    pullStartY.current = null;
    if (pullDistance < 54) {
      setPullDistance(0);
      return;
    }
    setPullRefreshing(true);
    setPullDistance(62);
    try {
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      window.setTimeout(() => {
        setPullRefreshing(false);
        setPullDistance(0);
      }, 320);
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
    <main className="homie-shell" onTouchStart={beginPull} onTouchMove={movePull} onTouchEnd={endPull} onTouchCancel={endPull}>
      {view !== "add" && !selectedTask ? (
        <div
          className={clsx("pull-refresh", (pullDistance > 0 || pullRefreshing) && "is-visible", pullRefreshing && "is-refreshing")}
          style={{ transform: `translate(-50%, ${Math.min(pullDistance, 62)}px)` }}
          aria-hidden="true"
        >
          <RefreshCw size={16} />
        </div>
      ) : null}
      <section
        className={clsx("app-hero", view === "add" && "is-compact")}
        style={{
          padding: "calc(36px + env(safe-area-inset-top)) 22px 8px",
        }}
      >
        <header className="top-bar" style={{ minHeight: 42 }}>
          <div className="brand-lockup">
            <h1>Homie</h1>
          </div>
        </header>

        {view !== "add" ? (
          <nav className="mode-tabs" aria-label="Main navigation" style={{ height: 54, margin: "16px auto 0" }}>
            <NavButton icon={<CalendarClock size={18} />} label="Today" active={view === "today"} onClick={() => setView("today")} />
            <NavButton icon={<CalendarDays size={18} />} label="Week" active={view === "week"} onClick={() => setView("week")} />
            <NavButton icon={<ListFilter size={18} />} label="Sort" active={view === "sort"} onClick={() => setView("sort")} />
            <NavButton icon={<ClipboardCheck size={18} />} label="All" active={view === "all"} onClick={() => setView("all")} />
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
          onOpen={(task) => openTaskDetail(task.id)}
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
          onOpen={(task) => openTaskDetail(task.id)}
          onComplete={completeTask}
          onReopen={reopenTask}
        />
      ) : view === "sort" ? (
        <SortBoard
          tasks={visibleTasks}
          busyTaskId={busyTaskId}
          recentlyCompletedId={recentlyCompletedId}
          onOpen={(task) => openTaskDetail(task.id)}
          onComplete={completeTask}
          onReopen={reopenTask}
          onSortTasks={sortTasks}
        />
      ) : (
        <>
          <section className="view-head">
            <div>
              <p className="eyebrow">All tasks</p>
              <h2>{viewTitle(view, visibleTasks.length)}</h2>
            </div>
            <button
              className={clsx("icon-toggle", timeSensitiveOnly && "is-on")}
              type="button"
              onClick={() => setTimeSensitiveOnly((value) => !value)}
              aria-label="Filter time-sensitive tasks"
            >
              <CalendarClock size={20} />
            </button>
          </section>

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

          <section className="task-stack" aria-label="Tasks">
            {visibleTasks.length ? (
              visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  busy={busyTaskId === task.id}
                  justCompleted={recentlyCompletedId === task.id}
                  onOpen={() => openTaskDetail(task.id)}
                  onComplete={() => completeTask(task)}
                  onReopen={() => reopenTask(task)}
                />
              ))
            ) : (
              <EmptyState view={view} />
            )}
          </section>
          <DoneArchive
            tasks={completedTasks}
            busyTaskId={busyTaskId}
            recentlyCompletedId={recentlyCompletedId}
            onOpen={(task) => openTaskDetail(task.id)}
            onComplete={completeTask}
            onReopen={reopenTask}
          />
        </>
      )}

      {selectedTask ? (
        <TaskDetailSheet
          key={selectedTask.id}
          bootstrap={bootstrap}
          task={selectedTask}
          currentPersonId={currentPersonId}
          busy={busyTaskId === selectedTask.id}
          onClose={closeTaskDetail}
          onArchive={() => archiveTask(selectedTask)}
          onPlan={(plannedFor) => planTask(selectedTask, plannedFor)}
          onRefresh={refresh}
          onError={setError}
        />
      ) : null}

      {settingsOpen ? <SettingsSheet themeId={themeId} onThemeChange={setThemeId} onClose={() => setSettingsOpen(false)} /> : null}

      {view !== "add" ? (
        <>
          <button className="floating-settings" type="button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            <Settings size={20} />
          </button>
          <button className="floating-add" type="button" onClick={() => setView("add")} aria-label="Add task">
            <Plus size={28} />
          </button>
        </>
      ) : null}
    </main>
  );
}

function SettingsSheet({
  themeId,
  onThemeChange,
  onClose,
}: {
  themeId: HomieThemeId;
  onThemeChange: (themeId: HomieThemeId) => void;
  onClose: () => void;
}) {
  return (
    <section className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-sheet">
        <header className="settings-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Make Homie yours</h2>
          </div>
          <button className="icon-toggle" type="button" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </header>

        <section className="settings-section" aria-label="Theme settings">
          <div>
            <h3>Theme</h3>
            <p>Pick the mood that fits the room: crisp daylight, cozy warm, or deep purple night mode.</p>
          </div>
          <div className="theme-option-list">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                className={clsx("theme-option", themeId === option.id && "is-active")}
                type="button"
                onClick={() => onThemeChange(option.id)}
                aria-pressed={themeId === option.id}
              >
                <span className={clsx("theme-swatch", `theme-swatch-${option.id}`)} aria-hidden="true" />
                <span>
                  <strong>{option.name}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
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
  const weekStart = days[0]?.value;
  const weekEnd = days[days.length - 1]?.value;
  const plannedThisWeek = openTasks.filter(
    (task) => task.plannedFor && days.some((day) => day.value === task.plannedFor) && !isPastPlannedTask(task, weekStart ?? dateKey(new Date())),
  );
  const dueThisWeek =
    weekStart && weekEnd
      ? openTasks
          .filter(
            (task) =>
              isPastPlannedTask(task, weekStart) ||
              (!task.plannedFor && task.dueAt && isDateKeyInRange(dueDateKey(task.dueAt), weekStart, weekEnd)),
          )
          .sort((first, second) => sortDueTasks(first, second, weekStart))
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
  const dueToday = openTasks
    .filter((task) => isDueTodayTask(task, todayKey))
    .sort((first, second) => sortDueTasks(first, second, todayKey));
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
          title="Due today"
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

function SortBoard({
  tasks,
  busyTaskId,
  recentlyCompletedId,
  onOpen,
  onComplete,
  onReopen,
  onSortTasks,
}: {
  tasks: Task[];
  busyTaskId: string | null;
  recentlyCompletedId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  onSortTasks: (updates: SortUpdate[]) => Promise<void>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [groupTargetId, setGroupTargetId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<SortDropPreview | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [groupDropBeforeId, setGroupDropBeforeId] = useState<string | null>(null);
  const [groupDragPreview, setGroupDragPreview] = useState<GroupDragPreview | null>(null);
  const [quickMoveTaskId, setQuickMoveTaskId] = useState<string | null>(null);
  const [groupNameDrafts, setGroupNameDrafts] = useState<Record<string, string>>({});
  const dragPreviewElement = useRef<HTMLDivElement | null>(null);
  const dragPreviewFrame = useRef<number | null>(null);
  const dragPreviewPoint = useRef({ x: 0, y: 0 });
  const groupDragPreviewElement = useRef<HTMLDivElement | null>(null);
  const groupDragPreviewFrame = useRef<number | null>(null);
  const groupDragPreviewPoint = useRef({ x: 0, y: 0 });
  const groupTimer = useRef<number | null>(null);
  const groupCandidate = useRef<string | null>(null);
  const groupReadyTarget = useRef<string | null>(null);
  const lastDropPreview = useRef<SortDropPreview | null>(null);
  const dragStart = useRef<DragStartState | null>(null);
  const groupDragStart = useRef<DragStartState | null>(null);
  const dragListeners = useRef<AbortController | null>(null);
  const groupDragListeners = useRef<AbortController | null>(null);
  const sortedTasks = useMemo(() => [...tasks].sort(sortBoardTasks), [tasks]);
  const ungroupedTasks = sortedTasks.filter((task) => !task.sortGroupId);
  const groups = useMemo(() => boardGroups(sortedTasks), [sortedTasks]);
  const draggingTask = draggingId ? tasks.find((task) => task.id === draggingId) ?? null : null;

  function clearGroupHover() {
    if (groupTimer.current !== null) {
      window.clearTimeout(groupTimer.current);
      groupTimer.current = null;
    }
    groupCandidate.current = null;
    groupReadyTarget.current = null;
    setGroupTargetId(null);
  }

  function stopDragging() {
    dragListeners.current?.abort();
    dragListeners.current = null;
    if (dragPreviewFrame.current !== null) {
      window.cancelAnimationFrame(dragPreviewFrame.current);
      dragPreviewFrame.current = null;
    }
    setDraggingId(null);
    setDropPreview(null);
    setDragPreview(null);
    lastDropPreview.current = null;
    dragStart.current = null;
    clearGroupHover();
  }

  function stopGroupDragging() {
    groupDragListeners.current?.abort();
    groupDragListeners.current = null;
    if (groupDragPreviewFrame.current !== null) {
      window.cancelAnimationFrame(groupDragPreviewFrame.current);
      groupDragPreviewFrame.current = null;
    }
    setDraggingGroupId(null);
    setGroupDropBeforeId(null);
    setGroupDragPreview(null);
    groupDragStart.current = null;
  }

  function beginPointerDrag(event: ReactPointerEvent<HTMLElement>) {
    const task = tasks.find((item) => item.id === event.currentTarget.dataset.sortDragId);
    if (!task) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragListeners.current?.abort();
    const controller = new AbortController();
    dragListeners.current = controller;
    window.addEventListener("pointermove", movePointerDrag, { passive: false, signal: controller.signal });
    window.addEventListener("pointerup", (nextEvent) => void endPointerDrag(nextEvent), { passive: false, signal: controller.signal });
    window.addEventListener("pointercancel", cancelPointerDrag, { signal: controller.signal });
    setDragPreview({ task, x: event.clientX, y: event.clientY });
    dragStart.current = {
      id: task.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };
  }

  function movePointerDrag(event: ActivePointerEvent) {
    const state = dragStart.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (!state.started && Math.hypot(deltaX, deltaY) < 3) return;

    event.preventDefault();
    if (!state.started) {
      state.started = true;
      setDraggingId(state.id);
    }

    moveDragPreview(event.clientX, event.clientY);
    updateDropTarget(event.clientX, event.clientY, state.id);
  }

  async function endPointerDrag(event: ActivePointerEvent) {
    const state = dragStart.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.started) {
      stopDragging();
      return;
    }

    event.preventDefault();
    const resolvedTarget = resolveDropTarget(event.clientX, event.clientY, state.id);
    const target = lastDropPreview.current?.mode === "group" ? lastDropPreview.current : resolvedTarget ?? lastDropPreview.current;
    try {
      if (target?.mode === "group" && target.groupTaskId) {
        if (groupReadyTarget.current === target.groupTaskId) {
          const targetTask = tasks.find((task) => task.id === target.groupTaskId);
          if (targetTask) {
            await moveIntoPile(state.id, targetTask);
          }
        }
      } else if (target) {
        const lane = laneInfo(target.laneId);
        await moveTask(state.id, lane.groupId, lane.groupName, target.beforeTaskId);
      }
    } finally {
      stopDragging();
    }
  }

  function cancelPointerDrag() {
    stopDragging();
  }

  function beginGroupPointerDrag(event: ReactPointerEvent<HTMLElement>) {
    const group = groups.find((item) => item.id === event.currentTarget.dataset.sortGroupDragId);
    if (!group) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    groupDragListeners.current?.abort();
    const controller = new AbortController();
    groupDragListeners.current = controller;
    window.addEventListener("pointermove", moveGroupPointerDrag, { passive: false, signal: controller.signal });
    window.addEventListener("pointerup", (nextEvent) => void endGroupPointerDrag(nextEvent), { passive: false, signal: controller.signal });
    window.addEventListener("pointercancel", cancelGroupPointerDrag, { signal: controller.signal });
    setGroupDragPreview({ name: group.name, count: group.tasks.length, x: event.clientX, y: event.clientY });
    groupDragStart.current = {
      id: group.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };
  }

  function moveGroupPointerDrag(event: ActivePointerEvent) {
    const state = groupDragStart.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (!state.started && Math.hypot(deltaX, deltaY) < 3) return;

    event.preventDefault();
    if (!state.started) {
      state.started = true;
      setDraggingGroupId(state.id);
    }

    moveGroupDragPreview(event.clientX, event.clientY);
    setGroupDropBeforeId(resolveGroupDropBefore(event.clientX, event.clientY, state.id));
  }

  async function endGroupPointerDrag(event: ActivePointerEvent) {
    const state = groupDragStart.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.started) {
      stopGroupDragging();
      return;
    }

    event.preventDefault();
    const beforeGroupId = resolveGroupDropBefore(event.clientX, event.clientY, state.id);
    try {
      await moveGroup(state.id, beforeGroupId);
    } finally {
      stopGroupDragging();
    }
  }

  function cancelGroupPointerDrag() {
    stopGroupDragging();
  }

  function updateDropTarget(x: number, y: number, dragId: string) {
    const target = resolveDropTarget(x, y, dragId);
    if (!sameDropPreview(target, lastDropPreview.current)) {
      lastDropPreview.current = target;
      setDropPreview(target);
    }

    if (target?.mode === "group" && target.groupTaskId) {
      if (groupCandidate.current === target.groupTaskId) return;
      clearGroupHover();
      groupCandidate.current = target.groupTaskId;
      groupTimer.current = window.setTimeout(() => {
        groupReadyTarget.current = target.groupTaskId;
        setGroupTargetId(target.groupTaskId);
      }, 1000);
      return;
    }

    clearGroupHover();
  }

  function moveDragPreview(x: number, y: number) {
    dragPreviewPoint.current = { x, y };
    if (dragPreviewFrame.current !== null) return;
    dragPreviewFrame.current = window.requestAnimationFrame(() => {
      dragPreviewFrame.current = null;
      if (!dragPreviewElement.current) return;
      dragPreviewElement.current.style.transform = `translate3d(${dragPreviewPoint.current.x}px, ${dragPreviewPoint.current.y}px, 0) translate(-50%, -50%)`;
    });
  }

  function moveGroupDragPreview(x: number, y: number) {
    groupDragPreviewPoint.current = { x, y };
    if (groupDragPreviewFrame.current !== null) return;
    groupDragPreviewFrame.current = window.requestAnimationFrame(() => {
      groupDragPreviewFrame.current = null;
      if (!groupDragPreviewElement.current) return;
      groupDragPreviewElement.current.style.transform = `translate3d(${groupDragPreviewPoint.current.x}px, ${groupDragPreviewPoint.current.y}px, 0) translate(-50%, -50%)`;
    });
  }

  function resolveGroupDropBefore(x: number, y: number, dragGroupId: string) {
    const element = document.elementFromPoint(x, y);
    const groupElement = element?.closest<HTMLElement>("[data-sort-group-id]");
    const groupId = groupElement?.dataset.sortGroupId;
    if (groupId && groupId !== dragGroupId) {
      const rect = groupElement.getBoundingClientRect();
      return y < rect.top + rect.height / 2 ? groupId : nextGroupId(groupId, dragGroupId);
    }
    return null;
  }

  function nextGroupId(groupId: string, dragGroupId: string) {
    const orderedGroups = groups.filter((group) => group.id !== dragGroupId);
    const index = orderedGroups.findIndex((group) => group.id === groupId);
    return index >= 0 ? orderedGroups[index + 1]?.id ?? null : null;
  }

  function resolveDropTarget(x: number, y: number, dragId: string): SortDropPreview | null {
    const element = document.elementFromPoint(x, y);
    const taskElement = element?.closest<HTMLElement>("[data-sort-task-id]");
    const taskId = taskElement?.dataset.sortTaskId;
    if (taskId && taskId !== dragId) {
      const laneId = taskElement.closest<HTMLElement>("[data-sort-lane-id]")?.dataset.sortLaneId ?? "loose";
      return { laneId, beforeTaskId: taskId, groupTaskId: taskId, mode: "group" };
    }

    const laneElement = element?.closest<HTMLElement>("[data-sort-lane-id]");
    if (laneElement) {
      const laneId = laneElement.dataset.sortLaneId ?? "loose";
      return { laneId, beforeTaskId: beforeTaskIdFromLane(laneElement, y, dragId), groupTaskId: null, mode: "insert" };
    }
    return null;
  }

  function beforeTaskIdFromLane(laneElement: HTMLElement, y: number, dragId: string) {
    const taskElements = [...laneElement.querySelectorAll<HTMLElement>("[data-sort-task-id]")].filter(
      (item) => item.dataset.sortTaskId !== dragId,
    );
    const beforeElement = taskElements.find((item) => {
      const rect = item.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });
    return beforeElement?.dataset.sortTaskId ?? null;
  }

  function laneInfo(laneId: string | null) {
    if (!laneId || laneId === "loose") {
      return { groupId: null, groupName: null };
    }
    const group = groups.find((item) => item.id === laneId);
    return { groupId: laneId, groupName: group?.name ?? "New pile" };
  }

  function groupOrderBase(groupId: string) {
    const groupIndex = Math.max(0, groups.findIndex((group) => group.id === groupId));
    return (groupIndex + 1) * GROUP_ORDER_STEP;
  }

  function changeGroupName(groupId: string, value: string) {
    setGroupNameDrafts((drafts) => ({ ...drafts, [groupId]: value }));
  }

  async function saveGroupName(groupId: string, value: string) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;
    const nextName = value.trim() || "New pile";
    setGroupNameDrafts((drafts) => {
      const nextDrafts = { ...drafts };
      delete nextDrafts[groupId];
      return nextDrafts;
    });
    if (nextName === group.name) return;
    await onSortTasks(
      group.tasks.map((task, index) => ({
        id: task.id,
        sortGroupId: groupId,
        sortGroupName: nextName,
        sortOrder: task.sortOrder || groupOrderBase(group.id) + (index + 1) * TILE_ORDER_STEP,
      })),
    );
  }

  async function dissolveGroup(groupId: string) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;
    const looseTasks = sortedTasks.filter((task) => !task.sortGroupId);
    const baseOrder = looseTasks.length * TILE_ORDER_STEP;
    await onSortTasks(
      group.tasks.map((task, index) => ({
        id: task.id,
        sortGroupId: null,
        sortGroupName: null,
        sortOrder: baseOrder + (index + 1) * TILE_ORDER_STEP,
      })),
    );
  }

  async function moveGroup(groupId: string, beforeGroupId: string | null) {
    const movingGroup = groups.find((group) => group.id === groupId);
    if (!movingGroup) return;
    const nextGroups = groups.filter((group) => group.id !== groupId);
    const insertIndex = beforeGroupId ? nextGroups.findIndex((group) => group.id === beforeGroupId) : -1;
    nextGroups.splice(insertIndex >= 0 ? insertIndex : nextGroups.length, 0, movingGroup);

    await onSortTasks(
      nextGroups.flatMap((group, groupIndex) => {
        const baseOrder = (groupIndex + 1) * GROUP_ORDER_STEP;
        return [...group.tasks].sort(sortBoardTasks).map((task, taskIndex) => ({
          id: task.id,
          sortGroupId: group.id,
          sortGroupName: group.name,
          sortOrder: baseOrder + (taskIndex + 1) * TILE_ORDER_STEP,
        }));
      }),
    );
  }

  async function quickMoveToGroup(taskId: string, groupId: string) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;
    setQuickMoveTaskId(null);
    await moveTask(taskId, group.id, group.name, null);
  }

  async function moveIntoPile(dragId: string, target: Task) {
    if (target.sortGroupId) {
      await moveTask(dragId, target.sortGroupId, target.sortGroupName ?? "New pile", null);
      return;
    }
    await createGroup(dragId, target);
  }

  async function createGroup(dragId: string, target: Task) {
    const source = tasks.find((task) => task.id === dragId);
    if (!source || source.id === target.id) return;
    const groupId = `group_${crypto.randomUUID()}`;
    const groupName = source.categoryId === target.categoryId ? `${target.category.name} pile` : "New pile";
    const baseOrder = (groups.length + 1) * GROUP_ORDER_STEP;
    await onSortTasks([
      { id: target.id, sortGroupId: groupId, sortGroupName: groupName, sortOrder: baseOrder + TILE_ORDER_STEP },
      { id: source.id, sortGroupId: groupId, sortGroupName: groupName, sortOrder: baseOrder + TILE_ORDER_STEP * 2 },
    ]);
  }

  async function moveTask(dragId: string, groupId: string | null, groupName: string | null, beforeTaskId: string | null) {
    const dragged = tasks.find((task) => task.id === dragId);
    if (!dragged) return;

    const sourceGroupId = dragged.sortGroupId ?? null;
    const sourceGroupName = dragged.sortGroupName ?? null;
    const targetTasks = tasks.filter((task) => task.id !== dragId && (task.sortGroupId ?? null) === groupId).sort(sortBoardTasks);
    const beforeIndex = beforeTaskId ? targetTasks.findIndex((task) => task.id === beforeTaskId) : -1;
    const insertIndex = beforeIndex >= 0 ? beforeIndex : targetTasks.length;
    targetTasks.splice(insertIndex, 0, dragged);
    const targetBaseOrder = groupId ? groupOrderBase(groupId) : 0;

    const updates = new Map<string, SortUpdate>();
    targetTasks.forEach((task, index) => {
      updates.set(task.id, {
        id: task.id,
        sortGroupId: groupId,
        sortGroupName: groupName,
        sortOrder: targetBaseOrder + (index + 1) * TILE_ORDER_STEP,
      });
    });

    if (sourceGroupId !== groupId) {
      const sourceBaseOrder = sourceGroupId ? groupOrderBase(sourceGroupId) : 0;
      tasks
        .filter((task) => task.id !== dragId && (task.sortGroupId ?? null) === sourceGroupId)
        .sort(sortBoardTasks)
        .forEach((task, index) => {
          updates.set(task.id, {
            id: task.id,
            sortGroupId: sourceGroupId,
            sortGroupName: sourceGroupName,
            sortOrder: sourceBaseOrder + (index + 1) * TILE_ORDER_STEP,
          });
        });
    }

    await onSortTasks([...updates.values()]);
  }

  function renderLaneTiles(laneTasks: Task[], laneId: string) {
    const visibleTasks = laneTasks;
    const nodes: ReactNode[] = [];
    visibleTasks.forEach((task) => {
      const quickMoveGroups = groups.filter((group) => group.id !== task.sortGroupId);
      if (shouldShowInsertSlot(laneId, task.id)) {
        nodes.push(<SortDropSlot key={`slot-before-${task.id}`} />);
      }
      nodes.push(
        <Fragment key={task.id}>
          <SortTile
            task={task}
            busy={busyTaskId === task.id}
            justCompleted={recentlyCompletedId === task.id}
            dragging={draggingId === task.id}
            grouping={groupTargetId === task.id}
            groupCandidate={dropPreview?.mode === "group" && dropPreview.groupTaskId === task.id}
            quickMoveGroups={quickMoveGroups}
            quickMoveOpen={quickMoveTaskId === task.id}
            onOpen={() => onOpen(task)}
            onComplete={() => onComplete(task)}
            onReopen={() => onReopen(task)}
            onPointerDown={beginPointerDrag}
            onToggleQuickMove={() => setQuickMoveTaskId((current) => (current === task.id ? null : task.id))}
            onQuickMove={(groupId) => void quickMoveToGroup(task.id, groupId)}
          />
          {groupTargetId === task.id && draggingTask ? <SortPilePreview source={draggingTask} target={task} /> : null}
        </Fragment>,
      );
    });

    if (shouldShowInsertSlot(laneId, null)) {
      nodes.push(<SortDropSlot key={`slot-end-${laneId}`} />);
    }

    return nodes;
  }

  function shouldShowInsertSlot(laneId: string, beforeTaskId: string | null) {
    return Boolean(draggingId && dropPreview?.mode === "insert" && dropPreview.laneId === laneId && dropPreview.beforeTaskId === beforeTaskId);
  }

  return (
    <>
      <section className="view-head sort-head">
        <div>
          <h2>Sort board</h2>
        </div>
      </section>

      <section className="sort-board" aria-label="Task sort board">
        {groups.map((group) => (
          <Fragment key={group.id}>
            {draggingGroupId && groupDropBeforeId === group.id ? <SortGroupDropSlot /> : null}
            <section
              className={clsx(
                "sort-lane sort-pile",
                draggingId && "is-drop-ready",
                dropPreview?.laneId === group.id && "is-drop-target",
                draggingGroupId === group.id && "is-group-dragging",
              )}
              data-sort-lane-id={group.id}
              data-sort-group-id={group.id}
              aria-label={group.name}
            >
              <header className="sort-lane-head sort-pile-head">
                <button
                  className="sort-group-drag-handle"
                  type="button"
                  data-sort-group-drag-id={group.id}
                  onPointerDown={beginGroupPointerDrag}
                  aria-label={`Move ${group.name}`}
                >
                  <Menu size={22} aria-hidden="true" />
                </button>
                <input
                  className="sort-group-name-input"
                  value={groupNameDrafts[group.id] ?? group.name}
                  onChange={(event) => changeGroupName(group.id, event.target.value)}
                  onBlur={(event) => void saveGroupName(group.id, event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  aria-label={`Rename ${group.name}`}
                />
                <div className="sort-group-actions">
                  <span>{group.tasks.length}</span>
                  <button className="sort-group-action" type="button" onClick={() => void dissolveGroup(group.id)} aria-label={`Move ${group.name} back to loose tiles`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </header>
              <div className="sort-tile-list">
                {renderLaneTiles(group.tasks, group.id)}
              </div>
            </section>
          </Fragment>
        ))}
        {draggingGroupId && groupDropBeforeId === null ? <SortGroupDropSlot /> : null}

        <section
          className={clsx("sort-lane sort-loose-lane", draggingId && "is-drop-ready", dropPreview?.laneId === "loose" && "is-drop-target")}
          data-sort-lane-id="loose"
          aria-label="Loose tasks"
        >
          <header className="sort-lane-head">
            <h3>Loose tiles</h3>
            <span>{ungroupedTasks.length}</span>
          </header>
          <div className="sort-tile-list">
            {ungroupedTasks.length || shouldShowInsertSlot("loose", null) ? (
              renderLaneTiles(ungroupedTasks, "loose")
            ) : (
              <p className="sort-empty">Drag tiles here to pull them out of a pile.</p>
            )}
          </div>
        </section>
      </section>
      {dragPreview && draggingTask ? (
        <div
          ref={dragPreviewElement}
          className="sort-drag-preview"
          style={{ transform: `translate3d(${dragPreview.x}px, ${dragPreview.y}px, 0) translate(-50%, -50%)` }}
          aria-hidden="true"
        >
          <strong>{dragPreview.task.title}</strong>
          <small>{dragPreview.task.category.name} · {dragPreview.task.assignee?.name ?? "Unassigned"}</small>
        </div>
      ) : null}
      {groupDragPreview ? (
        <div
          ref={groupDragPreviewElement}
          className="sort-drag-preview sort-group-drag-preview"
          style={{ transform: `translate3d(${groupDragPreview.x}px, ${groupDragPreview.y}px, 0) translate(-50%, -50%)` }}
          aria-hidden="true"
        >
          <strong>{groupDragPreview.name}</strong>
          <small>{groupDragPreview.count} tiles</small>
        </div>
      ) : null}
    </>
  );
}

function SortTile({
  task,
  busy,
  justCompleted,
  dragging,
  grouping,
  groupCandidate,
  quickMoveGroups,
  quickMoveOpen,
  onOpen,
  onComplete,
  onReopen,
  onPointerDown,
  onToggleQuickMove,
  onQuickMove,
}: {
  task: Task;
  busy: boolean;
  justCompleted: boolean;
  dragging: boolean;
  grouping: boolean;
  groupCandidate: boolean;
  quickMoveGroups: Array<{ id: string; name: string }>;
  quickMoveOpen: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onToggleQuickMove: () => void;
  onQuickMove: (groupId: string) => void;
}) {
  const done = task.status === "done";
  const canQuickMove = quickMoveGroups.length > 0;
  return (
    <article
      data-sort-task-id={task.id}
      className={clsx(
        "sort-tile",
        dragging && "is-dragging",
        groupCandidate && "is-group-candidate",
        grouping && "is-group-target",
        justCompleted && "just-completed",
      )}
    >
      <button
        className={clsx("complete-button", done && "is-done", justCompleted && "is-celebrating")}
        type="button"
        disabled={busy}
        onClick={done ? onReopen : onComplete}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
      >
        {done ? <Check size={18} /> : <Circle size={18} />}
      </button>
      <button className="sort-tile-main" type="button" onClick={onOpen}>
        <span>
          <strong>{task.title}</strong>
          <small>{task.category.name} · {task.assignee?.name ?? "Unassigned"}</small>
        </span>
      </button>
      {canQuickMove ? (
        <button
          className={clsx("sort-quick-move", quickMoveOpen && "is-open")}
          type="button"
          onClick={onToggleQuickMove}
          disabled={busy}
          aria-label={`Move ${task.title} to a pile`}
          aria-expanded={quickMoveOpen}
        >
          <FolderInput size={18} aria-hidden="true" />
        </button>
      ) : null}
      <button
        className="sort-drag-handle"
        type="button"
        data-sort-drag-id={task.id}
        onPointerDown={onPointerDown}
        aria-label={`Move ${task.title}`}
      >
        <Menu size={24} aria-hidden="true" />
      </button>
      {quickMoveOpen ? (
        <div className="sort-quick-move-menu" role="menu" aria-label={`Choose a pile for ${task.title}`}>
          {quickMoveGroups.map((group) => (
            <button key={group.id} type="button" role="menuitem" onClick={() => onQuickMove(group.id)}>
              {group.name}
            </button>
          ))}
        </div>
      ) : null}
      {grouping ? <span className="drop-to-group">Make pile</span> : null}
    </article>
  );
}

function SortDropSlot() {
  return <div className="sort-drop-slot" aria-hidden="true" />;
}

function SortGroupDropSlot() {
  return <div className="sort-group-drop-slot" aria-hidden="true" />;
}

function SortPilePreview({ source, target }: { source: Task; target: Task }) {
  return (
    <div className="sort-pile-preview" aria-hidden="true">
      <span>{target.title}</span>
      <span>{source.title}</span>
    </div>
  );
}

function DoneArchive({
  tasks,
  busyTaskId,
  recentlyCompletedId,
  onOpen,
  onComplete,
  onReopen,
}: {
  tasks: Task[];
  busyTaskId: string | null;
  recentlyCompletedId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
}) {
  return (
    <details className="done-archive">
      <summary>
        <span>Done</span>
        <small>{tasks.length} completed</small>
      </summary>
      {tasks.length ? (
        <section className="task-stack compact-stack" aria-label="Completed tasks">
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
        </section>
      ) : (
        <p className="sort-empty">Nothing checked off yet.</p>
      )}
    </details>
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

          <section className="repeat-editor" aria-label="Repeat settings">
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
  const showingDone = done || justCompleted;
  const overdue = isTaskOverdue(task);
  const reviewedByClaw = task.agentReview.isFresh;
  return (
    <article className={clsx("task-card", overdue && "is-overdue", justCompleted && "just-completed")} data-testid="task-card">
      <button
        className={clsx("complete-button", showingDone && "is-done", justCompleted && "is-celebrating")}
        type="button"
        disabled={busy}
        onClick={done ? onReopen : onComplete}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
      >
        {showingDone ? <Check size={22} /> : <Circle size={22} />}
      </button>
      <button className="task-main" type="button" onClick={onOpen}>
        <span className="task-title">{task.title}</span>
        {task.description ? <span className="task-description">{task.description}</span> : null}
        <span className="task-meta">
          <span className="task-pill category-pill" style={{ borderColor: task.category.color, color: task.category.color }}>
            {task.category.name}
          </span>
          <span className={clsx("task-pill", "owner-pill", personPillClass(task.assignee))}>{task.assignee?.name ?? "Unassigned"}</span>
          {overdue ? (
            <span className="task-pill overdue-pill" aria-label={`${task.title} is overdue`}>
              <Flag size={11} />
              Overdue
            </span>
          ) : null}
          <span className="task-pill timing-pill">{taskTimingLabel(task)}</span>
          {task.priority !== "normal" ? (
            <span className={clsx("task-pill", "priority-pill", `task-priority-${task.priority}`)}>{priorityLabels[task.priority]}</span>
          ) : null}
          {task.photos.length ? (
            <span className="task-pill photo-indicator" aria-label={`${task.photos.length} photo${task.photos.length === 1 ? "" : "s"} attached`}>
              <Camera size={12} />
            </span>
          ) : null}
          {reviewedByClaw ? (
            <span className="task-pill claw-pill" aria-label="Reviewed by Claw" title={clawReviewTitle(task)}>
              <span aria-hidden="true">🦞</span>
            </span>
          ) : null}
          {task.recurringRule?.isActive ? (
            <span className="task-pill repeat-pill">
              <Repeat2 size={12} />
              {recurrenceLabel(task.recurringRule)}
            </span>
          ) : null}
        </span>
      </button>
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
  const [isEditing, setIsEditing] = useState(false);
  const [editTitleDraft, setEditTitleDraft] = useState({ taskId: task.id, value: task.title });
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const reviewedByClaw = task.agentReview.isFresh;
  const editTitle = editTitleDraft.taskId === task.id ? editTitleDraft.value : task.title;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  async function updateTask(
    patch: Partial<Pick<Task, "title" | "categoryId" | "assigneeId" | "priority" | "dueAt">> & {
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

  async function saveTitle() {
    const title = editTitle.trim();
    if (!title) {
      setEditTitleDraft({ taskId: task.id, value: task.title });
      return;
    }
    if (title === task.title) return;
    await updateTask({ title });
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

  async function copyTaskLink() {
    try {
      await copyTextToClipboard(taskShareUrl(task.id));
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    } catch (nextError) {
      onError((nextError as Error).message);
    }
  }

  return (
    <section
      className="detail-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ alignItems: "flex-start", padding: "calc(58px + env(safe-area-inset-top)) var(--space-3) 24px" }}
      aria-label="Task detail"
    >
      <div className="detail-sheet" onClick={(event) => event.stopPropagation()} style={{ maxHeight: "calc(100dvh - 82px - env(safe-area-inset-top))" }}>
        <header className="detail-header">
          <div>
            <p className="eyebrow">{task.category.name}</p>
            <h2>{task.title}</h2>
          </div>
          <div className="detail-actions">
            <button
              className={clsx("icon-toggle share-toggle", linkCopied && "is-copied")}
              type="button"
              onClick={copyTaskLink}
              aria-label={linkCopied ? "Task link copied" : "Copy task link"}
            >
              {linkCopied ? <Check size={18} /> : <Link2 size={18} />}
            </button>
            <button
              className={clsx("icon-toggle", isEditing && "is-on")}
              type="button"
              onClick={() => setIsEditing((value) => !value)}
              aria-label={isEditing ? "Stop editing task" : "Edit task details"}
            >
              <Pencil size={18} />
            </button>
            <button className="icon-toggle" type="button" onClick={onClose} aria-label="Close task detail">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="detail-chips">
          {task.priority !== "normal" ? (
            <span className={clsx("priority-chip", `priority-${task.priority}`, "is-selected")}>{priorityLabels[task.priority]}</span>
          ) : null}
          <span className={clsx("detail-person-pill", personPillClass(task.assignee))}>{task.assignee?.name ?? "Unassigned"}</span>
          {task.plannedFor ? <span>{plannedLabel(task.plannedFor)}</span> : null}
          {task.dueAt ? <span>Due {formatDueDate(task.dueAt)}</span> : null}
          {task.recurringRule?.isActive ? (
            <span className="repeat-chip">
              <Repeat2 size={13} />
              {recurrenceSummary(task.recurringRule)}
            </span>
          ) : null}
          {reviewedByClaw ? (
            <span className="claw-review-chip" aria-label="Reviewed by Claw" title={clawReviewTitle(task)}>
              <span aria-hidden="true">🦞</span>
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

        {isEditing ? (
          <section className="edit-panel" aria-label="Edit task details">
          <label className="field-block edit-title-field">
            <span>Title</span>
              <input
                type="text"
                value={editTitle}
              onChange={(event) => setEditTitleDraft({ taskId: task.id, value: event.target.value })}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setEditTitleDraft({ taskId: task.id, value: task.title });
                  event.currentTarget.blur();
                }
              }}
              disabled={busy || parentBusy}
              maxLength={160}
            />
          </label>
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

          <section className="repeat-editor" aria-label="Repeat settings">
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
            {task.recurringRule?.isActive ? <p className="repeat-editor-copy">{recurrenceSummary(task.recurringRule)}</p> : null}
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
        ) : null}

        {task.photos.length ? (
          <div className="photo-grid">
            {task.photos.map((photo) => (
              <button
                key={photo.id}
                className="photo-tile"
                style={{ display: "block", overflow: "hidden", padding: 0, border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface-soft)" }}
                type="button"
                onClick={() => setExpandedPhotoId(photo.id)}
                aria-label={`Open ${photo.fileName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${photo.id}?variant=thumb`} alt={photo.caption || photo.fileName} loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ) : null}

        <section className="notes-list">
          <h3>Notes</h3>
          {task.description ? (
            <article className="note-item original-note">
              <div className="note-meta">
                <span>{task.createdBy?.name ?? "Original note"}</span>
                <time dateTime={task.createdAt}>{formatNoteTime(task.createdAt)}</time>
                <em>Initial note</em>
              </div>
              <p className="note-body">{linkifyText(task.description)}</p>
            </article>
          ) : null}
          {task.notes.length ? (
            task.notes.map((item) => (
              <article className="note-item" key={item.id}>
                <div className="note-meta">
                  <span>{noteAuthorLabel(item, bootstrap.people)}</span>
                  <time dateTime={item.createdAt}>{formatNoteTime(item.createdAt)}</time>
                </div>
                <p className="note-body">{linkifyText(item.body)}</p>
              </article>
            ))
          ) : !task.description ? (
            <p className="muted">No notes yet.</p>
          ) : null}
        </section>

        <form className="note-form" onSubmit={submitNote}>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note" maxLength={4000} />
          <button type="submit" disabled={busy || !note.trim()} aria-label="Send note">
            <Send size={18} />
          </button>
        </form>

        <button
          className="danger-action"
          type="button"
          onClick={onArchive}
          disabled={busy || parentBusy}
          aria-label={task.recurringRule?.isActive ? "Remove series" : "Remove task"}
        >
          <Trash2 size={18} />
          <span>{parentBusy ? "Removing" : task.recurringRule?.isActive ? "Remove series" : "Remove from board"}</span>
        </button>
      </div>

      {expandedPhotoId ? (
        <button
          className="photo-lightbox"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            display: "grid",
            placeItems: "center",
            padding: "calc(48px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom))",
            background: "var(--photo-lightbox-bg)",
          }}
          type="button"
          onClick={() => setExpandedPhotoId(null)}
          aria-label="Close enlarged photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img style={{ maxWidth: "min(100%, 720px)", maxHeight: "78dvh", objectFit: "contain", borderRadius: 18 }} src={`/api/photos/${expandedPhotoId}?variant=large`} alt="" decoding="async" />
        </button>
      ) : null}
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
      {view === "sort" ? <ListFilter size={26} /> : <Inbox size={26} />}
      <h3>{view === "sort" ? "Nothing to arrange" : "Clear for now"}</h3>
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function syncTaskUrl(taskId: string | null, mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href);
  if (taskId) {
    url.searchParams.set("task", taskId);
  } else {
    url.searchParams.delete("task");
  }
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  if (nextUrl === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  window.history[mode === "replace" ? "replaceState" : "pushState"](null, "", nextUrl);
}

function taskShareUrl(taskId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("task", taskId);
  return url.toString();
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Could not copy the task link.");
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

function personPillClass(person: Person | null) {
  if (person?.slug === "caroline") return "person-caroline";
  if (person?.slug === "ryan") return "person-ryan";
  return "person-unassigned";
}

function sameDropPreview(first: SortDropPreview | null, second: SortDropPreview | null) {
  if (first === second) return true;
  if (!first || !second) return false;
  return (
    first.laneId === second.laneId &&
    first.beforeTaskId === second.beforeTaskId &&
    first.groupTaskId === second.groupTaskId &&
    first.mode === second.mode
  );
}

function sortBoardTasks(first: Task, second: Task) {
  const firstGroup = first.sortGroupId ?? "";
  const secondGroup = second.sortGroupId ?? "";
  if (firstGroup !== secondGroup) return firstGroup.localeCompare(secondGroup);
  if (first.sortOrder !== second.sortOrder) return first.sortOrder - second.sortOrder;
  return first.createdAt.localeCompare(second.createdAt);
}

function boardGroups(tasks: Task[]) {
  const groups = new Map<string, { id: string; name: string; order: number; tasks: Task[] }>();
  for (const task of tasks) {
    if (!task.sortGroupId) continue;
    const group = groups.get(task.sortGroupId) ?? {
      id: task.sortGroupId,
      name: task.sortGroupName || "New pile",
      order: task.sortOrder,
      tasks: [],
    };
    group.tasks.push(task);
    group.order = Math.min(group.order, task.sortOrder);
    groups.set(task.sortGroupId, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      tasks: group.tasks.sort(sortBoardTasks),
    }))
    .sort((first, second) => {
      const orderDiff = first.order - second.order;
      if (orderDiff !== 0) return orderDiff;
      return first.name.localeCompare(second.name);
    });
}

function clawReviewTitle(task: Task) {
  if (!task.agentReview.reviewedAt) return "Reviewed by Claw";
  return `Reviewed by Claw ${formatNoteTime(task.agentReview.reviewedAt)}`;
}

function noteAuthorLabel(note: TaskNote, people: Person[]) {
  if (note.authorType === "human") {
    return people.find((person) => person.id === note.authorPersonId)?.name ?? "Someone";
  }
  if (note.authorType === "agent") return note.agentName ?? "Agent";
  return "System";
}

function formatNoteTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function linkifyText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (!/^https?:\/\//.test(part)) return part;
    const [, url = part, trailing = ""] = part.match(/^(.*?)([),.;:!?]+)?$/) ?? [];
    return (
      <span key={`${url}-${index}`}>
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
        {trailing}
      </span>
    );
  });
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

function isPastPlannedTask(task: Task, todayKey = dateKey(new Date())) {
  return Boolean(task.plannedFor) && (task.plannedFor as string) < todayKey;
}

function isDueTodayTask(task: Task, todayKey = dateKey(new Date())) {
  if (isPastPlannedTask(task, todayKey)) return true;
  if (task.plannedFor) return false;
  return Boolean(task.dueAt) && dueDateKey(task.dueAt as string) <= todayKey;
}

function isTaskOverdue(task: Task, todayKey = dateKey(new Date())) {
  if (task.status === "done" || task.status === "archived") return false;
  if (isPastPlannedTask(task, todayKey)) return true;
  if (task.plannedFor) return false;
  return Boolean(task.dueAt) && dueDateKey(task.dueAt as string) < todayKey;
}

function sortDueTasks(first: Task, second: Task, todayKey = dateKey(new Date())) {
  const firstDue = taskDueBucketKey(first, todayKey);
  const secondDue = taskDueBucketKey(second, todayKey);
  if (firstDue !== secondDue) return firstDue.localeCompare(secondDue);
  return first.createdAt.localeCompare(second.createdAt);
}

function taskDueBucketKey(task: Task, todayKey: string) {
  if (isPastPlannedTask(task, todayKey)) return task.plannedFor as string;
  if (task.dueAt) return dueDateKey(task.dueAt);
  return todayKey;
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
  if (value < today) return `Planned ${formatDueDate(`${value}T12:00:00`)}`;
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

function recurrenceSummary(rule: NonNullable<Task["recurringRule"]>) {
  const cadence = recurrenceLabel(rule).toLowerCase();
  const end = rule.endDate ? `until ${formatDueDate(`${rule.endDate}T12:00:00`)}` : "indefinitely";
  return `Repeats ${cadence} ${end}`;
}

function viewTitle(view: ViewMode, count: number) {
  if (view === "today") return count ? `${count} scheduled or due` : "Nada";
  if (view === "sort") return count ? `${count} tiles to arrange` : "Fresh slate";
  if (view === "week") return count ? `${count} scheduled or due` : "Nada";
  return `${count} open tasks`;
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
