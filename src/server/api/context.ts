import { getDbConnection } from "@/server/db/client";
import { CatalogRepository } from "@/server/domain/catalog/catalog-repository";
import { TaskRepository } from "@/server/domain/tasks/task-repository";
import { TaskService } from "@/server/domain/tasks/task-service";

export function getServices() {
  const conn = getDbConnection();
  const taskRepository = new TaskRepository(conn);
  return {
    conn,
    catalog: new CatalogRepository(conn),
    tasks: new TaskService(taskRepository),
  };
}
