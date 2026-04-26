# Homie

Homie is a mobile-first household task board for Ryan and Caroline. It is built for quick phone use: add tasks, attach photos from camera or camera roll, assign work, set priority and optional due dates, plan tasks into the next seven days, add notes, split tasks, and check things off with a satisfying flow.

The project is designed to run locally on a MacBook during development and later on a Mac mini over Tailscale.

## Stack

- Next.js, React, TypeScript
- Postgres
- Drizzle ORM schema types with SQL migrations
- Vitest for domain and integration tests
- Playwright for mobile browser workflow tests
- Native Mac mini runtime via Homebrew Postgres and `launchd`
- Docker Compose as an optional alternate server runtime

## Local Development

```bash
bash scripts/bootstrap-dev.sh
bash scripts/dev.sh
```

The dev script starts Homebrew Postgres, prepares the database, and serves Homie at:

```text
http://localhost:3000
```

For the dedicated test server:

```bash
npm run dev:test
```

## Mac Mini Setup

The recommended Mac mini setup is native Homebrew Postgres plus a user-level `launchd` service:

```bash
./setup.sh
```

That script installs/checks dependencies, writes `.env` if needed, prepares Postgres, builds the app, installs `~/Library/LaunchAgents/com.ryandunn.homie.plist`, starts Homie on `0.0.0.0:3000`, and runs a healthcheck.

Detailed instructions live in [docs/mac-mini-setup.md](./docs/mac-mini-setup.md).

## Validation

Run the full local proof suite:

```bash
npm run validate:local
```

That command prepares local Postgres databases, runs typecheck, lint, coverage tests, production build, and Playwright tests across mobile-sized and desktop viewports.

For the real-world UX/browser suite by itself:

```bash
npm run test:e2e:real-world
```

That suite drives the UI against `homie_e2e`, seeded household data, real uploads, and direct Postgres verification. Details live in [docs/real-world-e2e.md](./docs/real-world-e2e.md).

Current coverage target is intentionally high for the backend/domain layer:

```text
Statements: 85% minimum
Branches:   80% minimum
Functions:  85% minimum
Lines:      85% minimum
```

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

Starter people:

- Ryan
- Caroline
- Unassigned

Starter categories:

- House
- Cleaning
- Yard
- Errands
- Dump Run
- Admin

Tasks have both `due_at` and `planned_for`. `due_at` means time-sensitive obligation; `planned_for` is a date-only planning field for “I intend to do this on Wednesday,” which powers the Week view.

## API

Human UI routes live under `/api/tasks`, `/api/bootstrap`, and `/api/photos`.

Agent-facing routes live under `/api/agent/*` and are documented in [docs/agent-api.md](./docs/agent-api.md).

If `HOMIE_AGENT_TOKEN` is set, agent routes require:

```text
Authorization: Bearer <token>
```

## Runtime Files

Runtime files are intentionally outside Git:

- `data/postgres`
- `data/uploads`
- `backups`
- `.env`

Recommended Mac mini bootstrap:

```bash
./setup.sh
```

Run without installing the `launchd` service:

```bash
./setup.sh --no-service
```

Run the production server manually:

```bash
npm run start:mac-mini
```

Optional Docker Compose bootstrap:

```bash
bash scripts/bootstrap-server.sh
```

Optional Docker Compose deploy after pulling a new GitHub revision:

```bash
bash scripts/deploy.sh
```

Optional Docker Compose backup:

```bash
bash scripts/backup.sh
```
