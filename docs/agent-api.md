# Homie Agent API

Homie exposes JSON APIs for future OpenClaw-style agents. Agents should use these routes instead of scraping the UI.

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

Returns hydrated tasks including category, assignee, creator, photos, notes, recurrence, annotations, urgency, due date, and `plannedFor`.

### Get Task

```text
GET /api/agent/tasks/:id
```

Returns one hydrated task.

### Add Annotation

```text
POST /api/agent/tasks/:id/annotations
Content-Type: application/json
```

```json
{
  "agentName": "openclaw",
  "kind": "categorization",
  "body": "Looks like a sell/donate task.",
  "data": {
    "confidence": 0.91,
    "suggestedCategoryId": "cat_sell_donate"
  }
}
```

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

## Human-Compatible Write Routes

Agents may also use these task routes when acting intentionally:

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
