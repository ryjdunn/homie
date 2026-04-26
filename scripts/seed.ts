import { createDbConnection } from "../src/server/db/client";
import { CatalogRepository } from "../src/server/domain/catalog/catalog-repository";

const conn = createDbConnection(process.env.DATABASE_URL || "postgres://localhost:5432/homie_dev");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  try {
    const catalog = new CatalogRepository(conn);
    await catalog.seedStarterData();
    console.log("Seeded Homie starter people and categories");
  } finally {
    await conn.sql.end();
  }
}
