# Homie

Homie is a mobile-first household task board for Ryan and Caroline. It is tuned for quick phone use: add a task, attach photos, assign it, pick a priority, optionally set a due date, plan it onto a day, add notes, and check it off.

The app is built to run locally during development and as a small always-on service on a Mac Studio or Mac mini, ideally reachable from phones over Tailscale.

## Stack

- Next.js, React, TypeScript
- Postgres
- Drizzle ORM schema types with SQL migrations
- Vitest for domain and integration tests
- Playwright for mobile browser workflow tests
- Native macOS runtime through Homebrew Postgres and a user-level `launchd` service
- Optional Docker Compose runtime for non-macOS or containerized installs

## Current Product Model

People:

- Ryan
- Caroline
- Unassigned

Categories:

- House
- Sell/Donate
- Errands
- Kai

Task timing:

- `planned_for` is a date-only schedule slot. If a task is planned, Today and Week place it in the Scheduled section and ignore its due date for board placement.
- `due_at` is a date-only obligation marker in the UI. If a task is not planned but is due today/this week, Today and Week place it in the Due section.
- Tasks without a plan or due date stay out of Today/Week and remain visible in All.

Recurring tasks:

- A recurring task can repeat daily, weekly, or monthly with a custom interval such as every 2 weeks.
- Recurrence can run forever or stop at an end date.
- Completing a recurring task creates the next open occurrence and deactivates recurrence on the completed occurrence.
- Notes added after creation stay on the specific occurrence where they were written; they do not copy forward through the series.

More behavior notes live in [docs/homie-behavior.md](./docs/homie-behavior.md).

## Local Development

First-time setup:

```bash
bash scripts/bootstrap-dev.sh
```

Run the local dev server:

```bash
bash scripts/dev.sh
```

The dev script starts Homebrew Postgres, prepares `homie_dev`, and serves Homie on localhost. By default Next chooses port `3000`; if you want the shared side-browser/Tailscale port used during this build, run:

```bash
PORT=3100 DATABASE_URL=postgres://localhost:5432/homie_dev npm run dev -- --hostname 127.0.0.1
```

Dedicated Playwright dev server:

```bash
npm run dev:test
```

## Mac Studio Setup

The recommended Mac Studio setup is native Homebrew Postgres plus a user-level `launchd` service:

```bash
./setup.sh
```

That script checks dependencies, writes `.env` if needed, prepares Postgres, builds the app, installs `~/Library/LaunchAgents/com.ryandunn.homie.plist`, starts Homie on `127.0.0.1:3000`, and verifies `/api/health`.

Detailed instructions live in [docs/mac-mini-setup.md](./docs/mac-mini-setup.md). Despite the historical filename, it covers both Mac Studio and Mac mini.

Useful install variants:

```bash
./setup.sh --no-service
./setup.sh --validate
./setup.sh --port 3100
```

## Tailscale

For a quick dev share to a phone on the same tailnet:

```bash
PORT=3100 DATABASE_URL=postgres://localhost:5432/homie_dev npm run dev -- --hostname 127.0.0.1
tailscale serve --bg http://127.0.0.1:3100
tailscale serve status
```

If Next blocks dev resources for the Tailscale hostname, add that hostname to `allowedDevOrigins` in [next.config.ts](./next.config.ts) and restart the dev server.

For the Mac Studio production service, keep Homie bound to localhost and put Tailscale Serve in front of it:

```bash
tailscale serve --bg http://127.0.0.1:3000
```

Disable Tailscale Serve later with:

```bash
tailscale serve --https=443 off
```

## Validation

Fast local proof:

```bash
npm run typecheck
npm run lint
npm test
```

Full local proof:

```bash
npm run validate:local
```

`validate:local` prepares local Postgres databases, runs typecheck, lint, coverage tests, a production build, and Playwright tests across mobile-sized and desktop viewports.

Run the real-world browser suite by itself:

```bash
npm run test:e2e:real-world
```

Details live in [docs/real-world-e2e.md](./docs/real-world-e2e.md).

## Data Model

Core tables:

- `people`
- `categories`
- `tasks`
- `task_photos`
- `task_notes`
- `task_events`
- `recurring_rules`
- `agent_annotations`

Important task fields:

- `assignee_id`: who owns the work
- `created_by_id`: who added it
- `due_at`: obligation date, shown as a date in the UI
- `planned_for`: scheduled board date
- `parent_task_id`: previous occurrence for recurring rollover

## API

Human UI routes live under:

- `/api/bootstrap`
- `/api/tasks`
- `/api/tasks/:id`
- `/api/tasks/:id/notes`
- `/api/tasks/:id/photos`
- `/api/tasks/:id/complete`
- `/api/tasks/:id/reopen`
- `/api/photos/:id`

Agent-facing routes live under `/api/agent/*` and are documented in [docs/agent-api.md](./docs/agent-api.md). The intended OpenClaw tool shape is summarized in [docs/openclaw-integration.md](./docs/openclaw-integration.md).

If `HOMIE_AGENT_TOKEN` is set, agent routes require:

```text
Authorization: Bearer <token>
```

Agent routes support task reads, event reads, authenticated task creation/updates, notes, photos, completion/reopen, structured reviews, and advanced annotations. OpenClaw reviews drive the small lobster review marker in the UI; the marker clears whenever the task changes and returns after OpenClaw reviews it again.

## Runtime Files

Runtime files are intentionally outside Git:

- `data/postgres`
- `data/uploads`
- `backups`
- `.env`
- `.homie/*`

Optional Docker Compose bootstrap:

```bash
bash scripts/bootstrap-server.sh
```

Optional Docker Compose deploy after pulling a new Git revision:

```bash
bash scripts/deploy.sh
```

Optional Docker Compose backup:

```bash
bash scripts/backup.sh
```
