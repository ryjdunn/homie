# Homie Behavior

This document captures the current product rules so setup, testing, and future agent work all share the same mental model.

## Navigation

Homie has four primary views:

- Today
- Week
- All
- Done

Today and Week are intentionally narrow. They only show tasks that are scheduled or due in the relevant window. All is the broader backlog and filtering surface. Done is the recent completion surface.

## Owner Scope

Today and Week show an owner scope switch labeled `Showing`. Tapping it cycles through:

- Ryan
- Caroline
- All

This is a lightweight way to answer, “what is assigned to me right now?” All already has a full assignee filter, so the `Showing` switch does not appear there. Done also hides it.

The selected person is also the actor used when creating tasks and notes. Tasks show who they are assigned to and who added them.

## Task Creation

The add flow is deliberately flat:

- Task
- Note
- Photos
- Details
- Add task

There is no hidden Details drawer and no split-task feature. Photos are a first-class section, not buried in details.

The initial Note field is stored as the task description. Later notes added from the detail sheet are stored as `task_notes` on that specific task occurrence.

## Today And Week Placement

Today and Week both have two sections:

- Scheduled
- Due

Scheduling always wins. If a task has `planned_for`, it appears in Scheduled for that date/window regardless of due date.

If a task has no `planned_for` but does have `due_at`, it appears in Due when the due date falls in the current Today or Week window.

If a task has neither `planned_for` nor `due_at`, it does not appear in Today or Week. It stays in All.

## All View

All shows open tasks that are not done or archived. It has filters for:

- Category
- Assignee
- Time-sensitive only

Task cards show pills for category, owner, creator, timing, priority, and recurrence where relevant. There is no progress bar or unexplained status dot.

## Task Detail

Opening a task shows the plan control first because scheduling is the most common follow-up action. The detail sheet also supports editing:

- Category
- Owner
- Priority
- Due date
- Repeat rule
- Notes
- Removal from board

Due dates are date-only in the UI. Time input is intentionally omitted.

## Recurrence

Recurring items support:

- Daily, weekly, and monthly units
- Custom intervals such as every 2 weeks
- Optional end date
- Never-ending recurrence by default

When a recurring task is completed:

1. The completed occurrence is marked done.
2. Its recurring rule is deactivated.
3. A new active occurrence is created with `parent_task_id` pointing to the completed occurrence.
4. The new occurrence receives the copied task description, category, owner, priority, creator, and recurrence settings.
5. Later notes from the completed occurrence are not copied to the next occurrence.

This distinction matters:

- Description is the original task context and can carry forward.
- Notes are instance-specific comments and stay on that occurrence.

## Categories

Starter categories are:

- House
- Sell/Donate
- Errands
- Kai

Migration `0002_simplify_categories.sql` maps legacy categories into the current set:

- Dump Run -> Sell/Donate
- Cleaning/Yard/Admin -> House

## Provenance

Homie lightly tracks provenance:

- `assignee_id`: who owns the work
- `created_by_id`: who added the task
- note `author_person_id`: who wrote a note
- task events: created, updated, completed, reopened, note/photo/annotation added, recurrence scheduled

The UI surfaces this as `Added by Ryan/Caroline` on task cards and the detail sheet, and as the person name above each note.
