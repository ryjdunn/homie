# Real-World E2E Validation

Homie has a browser-driven validation suite that treats the app like a user would: it opens the mobile UI, adds tasks, uploads photos, comments, plans tasks into the next seven days, splits tasks, completes and reopens work, filters the board, removes tasks from the board, checks recurrence behavior, and verifies the database rows/events behind the UI.

Run only this suite:

```bash
npm run test:e2e:real-world
```

Run it as part of the full local proof:

```bash
npm run validate:local
```

The suite uses `homie_e2e`, resets task data in Playwright global setup, seeds realistic starter tasks, clears `.homie/e2e-uploads`, and then launches Homie against the real Next API and Postgres database.

Covered workflows include:

- Pre-populated board loading, browser console errors, and startup speed.
- Adding simple, urgent, due-date, photo-backed, and actor-specific tasks.
- Notes/comments, split tasks, completion, reopen, and remove-from-board archive flow.
- Week planning, clearing planned days, planned-task completion, and split children inheriting the same planned day.
- Category, assignee, time-sensitive, future-work, and done-view behavior.
- Long-title layout, no horizontal overflow, mobile tap targets, and disabled form controls.
- Recurring task rollover and agent API visibility/annotations.

On failure, Playwright keeps traces and screenshots under `test-results/`, so we can replay the exact UI state that broke.
