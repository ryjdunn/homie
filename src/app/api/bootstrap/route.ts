import { getServices } from "@/server/api/context";
import { route } from "@/server/api/http";

export async function GET() {
  return route(async () => {
    const { catalog } = getServices();
    const [people, categories] = await Promise.all([catalog.listPeople(), catalog.listCategories()]);
    return {
      people,
      categories,
      defaultPersonId: "person_ryan",
    };
  });
}
