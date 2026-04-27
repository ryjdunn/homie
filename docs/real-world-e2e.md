# Real-World E2E Validation

Homie has a browser-driven validation suite that treats the app like a user would: it opens the mobile UI, adds tasks, uploads photos, comments, plans tasks into the next seven days, completes and reopens work, filters the board, removes tasks from the board, checks recurrence behavior, and verifies the database rows/events behind the UI.

## Commands

Run only this suite:

```bash
npm run test:e2e:real-world
```

Run all Playwright workflows:

```bash
npm run test:e2e
```

Run it as part of the full local proof:

```bash
npm run validate:local
```

## Runtime

The suite uses:

- Database: `postgres://localhost:5432/homie_e2e`
- Upload directory: `.homie/e2e-uploads`
- Browser server: `http://127.0.0.1:3100`

Playwright global setup:

- Creates and migrates `homie_e2e`
- Seeds starter people and current categories
- Clears task data and e2e uploads
- Inserts realistic starter tasks for board-load tests

## Covered Workflows

- Pre-populated board loading, browser console errors, and startup speed.
- Adding simple, urgent, due-date, photo-backed, and actor-specific tasks.
- Notes/comments with person provenance.
- Completion, reopen, and remove-from-board archive flow.
- Today/Week Scheduled and Due sections.
- Week planning and clearing planned days.
- Category, assignee, time-sensitive, future-work, and Done-view behavior.
- Long-title layout, no horizontal overflow, mobile tap targets, and disabled form controls.
- Recurring task rollover into the next open occurrence.
- Recurring note isolation: later occurrence notes do not copy into the next task.
- Agent API visibility and annotations.

## Debugging Failures

Playwright keeps traces and screenshots under `test-results/`, so replay the exact UI state that broke:

```bash
npx playwright show-trace test-results/<failed-test>/trace.zip
```

Common local causes:

- Port `3100` is already running against `homie_dev`; Playwright may reuse it unless the config starts its own server.
- `homie_e2e` was not reset after schema changes. Run `DATABASE_URL=postgres://localhost:5432/homie_e2e npm run db:migrate`.
- A UI label changed and the test needs to be updated to the current product language.

For quick backend confidence without browser work:

```bash
npm run typecheck
npm run lint
npm test
```
