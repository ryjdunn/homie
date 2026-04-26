import { getDbConnection } from "@/server/db/client";
import { jsonError, jsonOk } from "@/server/api/http";

export async function GET() {
  try {
    const { sql } = getDbConnection();
    await sql`select 1`;
    return jsonOk({
      status: "ok",
      service: "homie",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
