DO $$ BEGIN
 CREATE TYPE person_kind AS ENUM ('human', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE task_status AS ENUM ('inbox', 'active', 'done', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE actor_type AS ENUM ('human', 'agent', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE task_event_type AS ENUM (
  'created',
  'updated',
  'completed',
  'reopened',
  'split',
  'note_added',
  'photo_added',
  'annotation_added',
  'recurrence_scheduled'
 );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'every_n_days', 'monthly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS people (
 id text PRIMARY KEY,
 slug text NOT NULL,
 name text NOT NULL,
 kind person_kind NOT NULL DEFAULT 'human',
 initials text NOT NULL,
 color text NOT NULL,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS people_slug_idx ON people (slug);

CREATE TABLE IF NOT EXISTS categories (
 id text PRIMARY KEY,
 slug text NOT NULL,
 name text NOT NULL,
 color text NOT NULL,
 icon text NOT NULL,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_idx ON categories (slug);

CREATE TABLE IF NOT EXISTS tasks (
 id text PRIMARY KEY,
 title text NOT NULL,
 description text NOT NULL DEFAULT '',
 status task_status NOT NULL DEFAULT 'inbox',
 priority task_priority NOT NULL DEFAULT 'normal',
 due_at timestamptz,
 category_id text NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
 assignee_id text REFERENCES people(id) ON DELETE SET NULL,
 created_by_id text REFERENCES people(id) ON DELETE SET NULL,
 completed_by_id text REFERENCES people(id) ON DELETE SET NULL,
 completed_at timestamptz,
 parent_task_id text REFERENCES tasks(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status);
CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON tasks (due_at);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks (priority);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks (category_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS tasks_parent_idx ON tasks (parent_task_id);

CREATE TABLE IF NOT EXISTS task_photos (
 id text PRIMARY KEY,
 task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 file_name text NOT NULL,
 mime_type text NOT NULL,
 byte_size integer NOT NULL,
 storage_key text NOT NULL,
 width integer,
 height integer,
 caption text NOT NULL DEFAULT '',
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_photos_task_idx ON task_photos (task_id);
CREATE UNIQUE INDEX IF NOT EXISTS task_photos_storage_key_idx ON task_photos (storage_key);

CREATE TABLE IF NOT EXISTS task_notes (
 id text PRIMARY KEY,
 task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 author_type actor_type NOT NULL,
 author_person_id text REFERENCES people(id) ON DELETE SET NULL,
 agent_name text,
 body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_notes_task_idx ON task_notes (task_id);

CREATE TABLE IF NOT EXISTS task_events (
 id text PRIMARY KEY,
 task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 actor_type actor_type NOT NULL,
 actor_person_id text REFERENCES people(id) ON DELETE SET NULL,
 agent_name text,
 event_type task_event_type NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_events_task_idx ON task_events (task_id);
CREATE INDEX IF NOT EXISTS task_events_created_at_idx ON task_events (created_at);
CREATE INDEX IF NOT EXISTS task_events_type_idx ON task_events (event_type);

CREATE TABLE IF NOT EXISTS recurring_rules (
 id text PRIMARY KEY,
 task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 frequency recurrence_frequency NOT NULL,
 interval integer NOT NULL DEFAULT 1,
 anchor_date date NOT NULL,
 next_due_at timestamptz NOT NULL,
 last_completed_at timestamptz,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recurring_rules_task_idx ON recurring_rules (task_id);
CREATE INDEX IF NOT EXISTS recurring_rules_next_due_idx ON recurring_rules (next_due_at);

CREATE TABLE IF NOT EXISTS agent_annotations (
 id text PRIMARY KEY,
 task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 agent_name text NOT NULL,
 kind text NOT NULL,
 body text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_annotations_task_idx ON agent_annotations (task_id);
CREATE INDEX IF NOT EXISTS agent_annotations_agent_idx ON agent_annotations (agent_name);
