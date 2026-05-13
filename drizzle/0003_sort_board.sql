ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_group_id text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_group_name text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS tasks_sort_group_idx ON tasks (sort_group_id);
CREATE INDEX IF NOT EXISTS tasks_sort_order_idx ON tasks (sort_order);
