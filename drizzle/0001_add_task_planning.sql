ALTER TABLE tasks
 ADD COLUMN IF NOT EXISTS planned_for date;

CREATE INDEX IF NOT EXISTS tasks_planned_for_idx ON tasks (planned_for);
