# OpenClaw Integration Shape

Homie should feel like one clear household-task capability to OpenClaw, not a bag of raw HTTP routes. The raw route reference lives in [agent-api.md](./agent-api.md); this is the model for the future OpenClaw plugin and bundled skill.

## Boundary

- Discord is the conversation surface.
- Homie is the task state and durable artifact surface.
- OpenClaw should write to Homie only when it is creating/changing a task, attaching useful task context, completing/reopening a task at Ryan's request, or recording that it reviewed the current task state.

## Tool Contract

The future OpenClaw plugin should expose a small typed tool set:

- `homie_list_tasks`: list tasks, defaulting cron/review crawls to `status=open` and `needsReview=true`.
- `homie_get_sort_board`: read the Sort board as ordered groups plus loose tiles, defaulting to open household work.
- `homie_get_task`: fetch one hydrated task by id.
- `homie_create_task`: create a task from a trusted request.
- `homie_update_task`: edit title, description, category, assignee, priority, due date, schedule date, or recurrence.
- `homie_add_task_artifact`: add a durable note now, and later attach a photo/file artifact such as a return QR code.
- `homie_set_task_done`: complete or reopen a task using the dedicated completion routes so recurrence behavior stays correct.
- `homie_review_task`: mark the task reviewed after OpenClaw has assessed the current state.

Do not expose generic annotations as a normal model-facing tool. Keep them as implementation storage for advanced metadata. The model-facing review tool should call `POST /api/agent/tasks/:id/review`.

When the user is overwhelmed by the task list, talking about groups/piles, or asking where something belongs, OpenClaw should use `homie_get_sort_board` before suggesting changes. The board shape preserves the household organization Caroline sees in the Sort tab: named groups first, loose tiles last, and each task's `sortGroupId`, `sortGroupName`, and `sortOrder` available for careful updates.

## Review Loop

For a periodic crawl, OpenClaw should:

1. Call `homie_list_tasks` with `needsReview=true`.
2. For each task, decide whether it can help.
3. If it can help, do only safe background work, then ask Ryan in Discord before external actions such as returns, purchases, bookings, public posts, or account changes.
4. Add durable findings to Homie only when they are useful task artifacts.
5. Call `homie_review_task` last so the lobster marker represents the final state after that pass.

Useful review fields:

- `canHelp`: whether OpenClaw sees a plausible way to help.
- `helpKinds`: `return`, `sell_or_donate`, `research`, `schedule`, `reminder`, `attach_artifact`, `not_actionable`, or `other`.
- `nextAction`: `none`, `ask_user`, `research`, `attach_artifact`, `schedule`, or `external_action_pending_approval`.
- `confidence`: optional 0-1 confidence for its assessment.

If a card changes later, Homie clears the fresh review marker automatically by comparing the latest OpenClaw review time to the task's `updated_at`.
