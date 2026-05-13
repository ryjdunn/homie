# Homie Agent API

Homie exposes JSON APIs for future OpenClaw-style agents. Agents should use these routes instead of scraping the UI.

For the higher-level OpenClaw mental model, start with [OpenClaw Integration Shape](./openclaw-integration.md). This file is the low-level HTTP reference.

## Auth

If `HOMIE_AGENT_TOKEN` is configured, include:

```text
Authorization: Bearer <token>
```

During local development, leaving `HOMIE_AGENT_TOKEN` unset allows agent routes without a token.

Human-compatible write routes also record actor provenance. When an agent writes through them, include:

```text
x-homie-agent-name: openclaw
```

Agent-owned write routes also use `x-homie-agent-name` for provenance. If it is omitted, Homie records the actor as `openclaw`.

Human writes usually include:

```text
x-homie-person-id: person_ryan
```

## Response Shape

Successful responses:

```json
{
  "ok": true,
  "data": {}
}
```

Errors:

```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "Title is required"
  }
}
```

## IDs Agents Should Know

People:

- `person_ryan`
- `person_caroline`
- `person_unassigned`

Categories:

- `cat_house`
- `cat_sell_donate`
- `cat_errands`
- `cat_kai`

Prior category IDs such as `cat_dump_run`, `cat_cleaning`, `cat_yard`, and `cat_admin` are migrated away and should not be used for new writes.

## Agent Routes

The recommended OpenClaw crawl starts with:

```text
GET /api/agent/tasks?status=open&needsReview=true
```

That returns open tasks whose current card state has not been reviewed by OpenClaw yet, including tasks that changed after a previous review.

### List Tasks

```text
GET /api/agent/tasks
```

Query parameters:

- `status`: `open`, `inbox`, `active`, `done`, or `archived`
- `assigneeId`: person id
- `categoryId`: category id
- `priority`: `low`, `normal`, `high`, or `urgent`
- `plannedFor`: date-only `YYYY-MM-DD`
- `timeSensitive`: `true` or `1`
- `needsReview`: `true` or `1`

Returns hydrated tasks including category, assignee, creator, photos, notes, recurrence, annotations, agent review state, urgency, due date, and `plannedFor`.
Task objects also include Sort board placement fields: `sortGroupId`, `sortGroupName`, and `sortOrder`.

OpenClaw review state is returned as:

```json
{
  "agentReview": {
    "isFresh": true,
    "agentName": "openclaw",
    "reviewedAt": "2026-05-08T18:15:00.000Z"
  }
}
```

`agentReview.isFresh` is true when the latest `review` annotation from an agent whose name starts with `openclaw` is newer than or equal to the task's `updatedAt`. Any task mutation updates `updatedAt`, including task edits, planning changes, completion/reopen, notes, and photos. That means the UI lobster disappears after a card changes and returns only after OpenClaw reviews it again.

### Get Sort Board

```text
GET /api/agent/sort-board
```

Query parameters match `GET /api/agent/tasks` filters except the board always returns open, non-archived work. This is the preferred OpenClaw read when the user is talking about the Sort tab, piles, groups, or where a task belongs.

Returns grouped Sort board state with grouped piles first and loose tiles last:

```json
{
  "view": "sort",
  "summary": {
    "taskCount": 24,
    "groupCount": 4,
    "looseCount": 7
  },
  "groups": [
    {
      "id": "sort_group_garage",
      "name": "Garage",
      "order": 1000,
      "taskCount": 3,
      "tasks": []
    }
  ],
  "loose": {
    "id": "loose",
    "name": "Loose tiles",
    "order": null,
    "taskCount": 7,
    "tasks": []
  }
}
```

Each `tasks` entry is the same hydrated task shape returned by `GET /api/agent/tasks`.

### Get Task

```text
GET /api/agent/tasks/:id
```

Returns one hydrated task.

### Mark Reviewed

```text
POST /api/agent/tasks/:id/review
Content-Type: application/json
x-homie-agent-name: openclaw
```

```json
{
  "body": "Found the likely Amazon order. Ask Ryan before starting the return.",
  "canHelp": true,
  "helpKinds": ["return", "research"],
  "nextAction": "ask_user",
  "confidence": 0.82,
  "data": {
    "source": "gmail-search"
  }
}
```

This is the primary way OpenClaw says, "I looked at the current task state." It writes a structured `review` annotation, updates `agentReview`, and drives the UI lobster.

Allowed `helpKinds`:

- `return`
- `sell_or_donate`
- `research`
- `schedule`
- `reminder`
- `attach_artifact`
- `not_actionable`
- `other`

Allowed `nextAction` values:

- `none`
- `ask_user`
- `research`
- `attach_artifact`
- `schedule`
- `external_action_pending_approval`

### Add Annotation (Advanced)

```text
POST /api/agent/tasks/:id/annotations
Content-Type: application/json
```

```json
{
  "kind": "categorization",
  "body": "Looks like a sell/donate task.",
  "data": {
    "confidence": 0.91,
    "suggestedCategoryId": "cat_sell_donate"
  }
}
```

`agentName` is optional in the body. Prefer the `x-homie-agent-name` header so provenance is consistent across all agent writes. New OpenClaw integrations should prefer `/review` for review state and reserve generic annotations for internal metadata that should not affect the lobster marker.

### Event Feed

```text
GET /api/agent/events?limit=100
```

Returns recent task events newest-first. Agents can use this as a lightweight crawl point.

Current event types:

- `created`
- `updated`
- `completed`
- `reopened`
- `note_added`
- `photo_added`
- `annotation_added`
- `recurrence_scheduled`

## Agent-Owned Write Routes

These routes require the same agent token as the read routes. They should be the default OpenClaw integration surface for deliberate task changes requested through Discord or another trusted channel.

OpenClaw should not use Homie as a chat surface. Visible notes should be durable task artifacts, such as return instructions, a Craigslist draft, pricing rationale, or where a QR code came from.

### Create Task

```text
POST /api/agent/tasks
Content-Type: application/json
x-homie-agent-name: openclaw
```

Payload matches the human-compatible `POST /api/tasks` create payload.

### Update Task

```text
PATCH /api/agent/tasks/:id
Content-Type: application/json
x-homie-agent-name: openclaw
```

Payload matches the human-compatible `PATCH /api/tasks/:id` update payload. Use this for category, assignee, priority, due date, planning, status, and recurrence changes.

### Add Agent Note

```text
POST /api/agent/tasks/:id/notes
Content-Type: application/json
x-homie-agent-name: openclaw
```

```json
{
  "body": "Amazon return QR expires May 30. Drop at Whole Foods."
}
```

The note is stored with `author_type = agent` and `agent_name` from the header.

### Attach Agent Photo

```text
POST /api/agent/tasks/:id/photos
Content-Type: multipart/form-data
x-homie-agent-name: openclaw
```

Use one or more `photos` fields. This is the route for artifacts such as return QR images, item photos, or generated listing images that should live with the task.

### Mark Reviewed

Use `POST /api/agent/tasks/:id/review` after OpenClaw has assessed the current task state. Call this after any task edits, notes, or attached photos that are part of the same pass so the review remains fresh.

### Complete Or Reopen

```text
POST /api/agent/tasks/:id/complete
POST /api/agent/tasks/:id/reopen
x-homie-agent-name: openclaw
```

These routes are intended for explicit user requests, such as "mark that done" from Discord.

## Human-Compatible Write Routes

These routes power the human UI and remain compatible with agents that include `x-homie-agent-name`, but new OpenClaw integrations should prefer the agent-owned write routes above:

- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/notes`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/reopen`

### Create Task

```text
POST /api/tasks
Content-Type: application/json
```

```json
{
  "title": "Drop donation bags",
  "description": "Blue bags by the garage door.",
  "categoryId": "cat_sell_donate",
  "assigneeId": "person_ryan",
  "createdById": "person_ryan",
  "priority": "normal",
  "dueAt": "2026-04-29T12:00:00.000Z"
}
```

### Plan Or Clear Schedule

Send this payload to `PATCH /api/tasks/:id` to place a task on the Week/Today Scheduled section:

```json
{
  "plannedFor": "2026-04-29"
}
```

Clear a plan:

```json
{
  "plannedFor": null
}
```

### Date-Only Due

The UI treats due dates as date-only. API payloads still use ISO timestamps for `dueAt`; local UI submissions send noon local time to avoid midnight timezone drift.

```json
{
  "dueAt": "2026-04-29T12:00:00.000Z"
}
```

### Recurrence

Create or update recurrence by sending `recurrence` on `POST /api/tasks` or `PATCH /api/tasks/:id`.

```json
{
  "recurrence": {
    "frequency": "weekly",
    "interval": 2,
    "anchorDate": "2026-04-29T12:00:00.000Z",
    "endDate": null
  }
}
```

Supported frequencies:

- `daily`
- `weekly`
- `monthly`

`every_n_days` remains accepted in validation/domain types for compatibility but the UI currently exposes daily/weekly/monthly units.

Disable recurrence:

```json
{
  "recurrence": null
}
```

Completion of a recurring task creates the next active occurrence. Later notes are occurrence-specific and do not copy to the next occurrence.

### Add Note

```text
POST /api/tasks/:id/notes
Content-Type: application/json
```

```json
{
  "body": "Left the bags by the back door.",
  "authorPersonId": "person_caroline"
}
```

Notes record `author_person_id` and should represent the person or agent who actually wrote the note.
