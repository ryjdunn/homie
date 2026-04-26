# Homie Agent API

Homie exposes explicit JSON APIs for future OpenClaw agents. Agents should use these routes instead of scraping the UI.

## Auth

If `HOMIE_AGENT_TOKEN` is configured, include:

```text
Authorization: Bearer <token>
```

During local development, leaving `HOMIE_AGENT_TOKEN` unset allows agent routes without a token.

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

## Routes

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

### Get Task

```text
GET /api/agent/tasks/:id
```

Returns the hydrated task, including category, assignee, photos, notes, recurrence, annotations, urgency, due date, and `plannedFor`.

### Add Annotation

```text
POST /api/agent/tasks/:id/annotations
Content-Type: application/json
```

```json
{
  "agentName": "openclaw",
  "kind": "categorization",
  "body": "Looks like a dump run task.",
  "data": {
    "confidence": 0.91,
    "suggestedCategoryId": "cat_dump_run"
  }
}
```

### Event Feed

```text
GET /api/agent/events?limit=100
```

Returns recent task events newest-first. Agents can use this as a lightweight crawl point.

## Human-Compatible Write Routes

Agents may also use these task routes when acting intentionally:

- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/notes`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/reopen`
- `POST /api/tasks/:id/split`

When an agent writes through human-compatible routes, include:

```text
x-homie-agent-name: openclaw
```

Planning example:

```json
{
  "plannedFor": "2026-04-29"
}
```

Send that payload to `PATCH /api/tasks/:id` to place a task on the Week view, or use `null` to clear the plan.
