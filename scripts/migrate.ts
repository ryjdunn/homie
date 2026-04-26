import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL || "postgres://localhost:5432/homie_dev";
const sql = postgres(databaseUrl, { max: 1, prepare: false });
const migrationsDir = path.join(process.cwd(), "drizzle");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  try {
    await sql`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await sql<{ exists: boolean }[]>`
        select exists(select 1 from schema_migrations where name = ${file}) as exists
      `;

      if (alreadyApplied[0]?.exists) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const sqlText = await readFile(path.join(migrationsDir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlText);
        await tx`insert into schema_migrations (name) values (${file})`;
      });
      console.log(`Applied ${file}`);
    }
  } finally {
    await sql.end();
  }
}
