import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import postgres from "postgres";

const databaseUrl = "postgres://localhost:5432/homie_e2e";
const uploadDir = ".homie/e2e-uploads";

export default async function globalSetup() {
  execFileSync("npm", ["run", "db:create"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  execFileSync("npm", ["run", "db:migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await sql`
      truncate table
        agent_annotations,
        recurring_rules,
        task_events,
        task_notes,
        task_photos,
        tasks
      restart identity cascade
    `;
  } finally {
    await sql.end();
  }

  await rm(uploadDir, { recursive: true, force: true });
  await mkdir(uploadDir, { recursive: true });

  execFileSync("npm", ["run", "db:seed"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  await seedHouseholdFixtures();
}

async function seedHouseholdFixtures() {
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const now = new Date();
  const today = new Date(now);
  today.setHours(17, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(8, 0, 0, 0);

  try {
    await sql`
      insert into tasks (
        id,
        title,
        description,
        status,
        priority,
        due_at,
        planned_for,
        category_id,
        assignee_id,
        created_by_id,
        completed_at,
        completed_by_id,
        parent_task_id,
        updated_at
      )
      values
        (
          'e2e_seed_dump',
          'E2E seed: take old cardboard to recycling',
          'Pre-populated task used to prove the board loads real database rows.',
          'active',
          'urgent',
          ${today},
          ${dateKey(today)},
          'cat_sell_donate',
          'person_ryan',
          'person_ryan',
          null,
          null,
          null,
          now()
        ),
        (
          'e2e_seed_towels',
          'E2E seed: wash guest towels',
          'Caroline-visible fixture for filter and detail smoke checks.',
          'active',
          'high',
          ${tomorrow},
          ${dateKey(tomorrow)},
          'cat_house',
          'person_caroline',
          'person_caroline',
          null,
          null,
          null,
          now()
        ),
        (
          'e2e_seed_sheets',
          'E2E seed: wash sheets',
          'Recurring fixture that makes the e2e database feel lived in.',
          'active',
          'normal',
          ${nextWeek},
          null,
          'cat_house',
          'person_unassigned',
          'person_ryan',
          null,
          null,
          null,
          now()
        )
    `;

    await sql`
      insert into task_notes (id, task_id, author_type, author_person_id, agent_name, body)
      values (
        'e2e_seed_note_dump',
        'e2e_seed_dump',
        'human',
        'person_ryan',
        null,
        'Fixture note: boxes are stacked near the garage door.'
      )
    `;

    await sql`
      insert into recurring_rules (
        id,
        task_id,
        frequency,
        interval,
        anchor_date,
        next_due_at,
        last_completed_at,
        is_active,
        updated_at
      )
      values (
        'e2e_seed_rule_sheets',
        'e2e_seed_sheets',
        'weekly',
        1,
        ${nextWeek.toISOString().slice(0, 10)},
        ${nextWeek},
        null,
        true,
        now()
      )
    `;

    await sql`
      insert into task_events (id, task_id, actor_type, actor_person_id, agent_name, event_type, payload)
      values
        ('e2e_seed_event_dump', 'e2e_seed_dump', 'system', null, null, 'created', '{"source":"e2e-global-setup"}'::jsonb),
        ('e2e_seed_event_towels', 'e2e_seed_towels', 'system', null, null, 'created', '{"source":"e2e-global-setup"}'::jsonb),
        ('e2e_seed_event_sheets', 'e2e_seed_sheets', 'system', null, null, 'created', '{"source":"e2e-global-setup"}'::jsonb),
        ('e2e_seed_event_dump_note', 'e2e_seed_dump', 'system', null, null, 'note_added', '{"source":"e2e-global-setup"}'::jsonb)
    `;
  } finally {
    await sql.end();
  }
}

function dateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
