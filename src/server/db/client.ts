import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";

export type DbConnection = ReturnType<typeof createDbConnection>;

export function databaseUrlFromEnv() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

export function createDbConnection(databaseUrl = databaseUrlFromEnv()) {
  const sql = postgres(databaseUrl, {
    max: Number(process.env.HOMIE_DB_POOL_SIZE ?? 10),
    prepare: false,
  });

  return {
    db: drizzle(sql, { schema }),
    sql,
  };
}

const globalForDb = globalThis as unknown as {
  homieDb?: DbConnection;
};

export function getDbConnection() {
  if (!globalForDb.homieDb) {
    globalForDb.homieDb = createDbConnection();
  }

  return globalForDb.homieDb;
}
