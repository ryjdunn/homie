import { createDbConnection } from "@/server/db/client";
import { CatalogRepository } from "@/server/domain/catalog/catalog-repository";
import { TaskRepository } from "@/server/domain/tasks/task-repository";
import { TaskService } from "@/server/domain/tasks/task-service";

export function createTestServices() {
  const conn = createDbConnection(process.env.TEST_DATABASE_URL || "postgres://localhost:5432/homie_test");
  const taskRepository = new TaskRepository(conn);
  return {
    conn,
    catalog: new CatalogRepository(conn),
    tasks: new TaskService(taskRepository),
  };
}

export async function resetTestData(conn: ReturnType<typeof createDbConnection>) {
  await conn.sql`
    truncate table
      agent_annotations,
      recurring_rules,
      task_events,
      task_notes,
      task_photos,
      tasks
    restart identity cascade
  `;
  await new CatalogRepository(conn).seedStarterData();
}
