import postgres from "postgres";
import { dbNameFromUrl, maintenanceUrl } from "./db-url";

const databaseUrl = process.env.DATABASE_URL || "postgres://localhost:5432/homie_dev";
const databaseName = dbNameFromUrl(databaseUrl);
const sql = postgres(maintenanceUrl(databaseUrl), { max: 1, prepare: false });

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  try {
    const existing = await sql<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `;

    if (!existing[0]?.exists) {
      await sql.unsafe(`create database ${quoteIdentifier(databaseName)}`);
      console.log(`Created database ${databaseName}`);
    } else {
      console.log(`Database ${databaseName} already exists`);
    }
  } finally {
    await sql.end();
  }
}

function quoteIdentifier(value: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe database name: ${value}`);
  }
  return `"${value.replaceAll('"', '""')}"`;
}
