import { asc, eq } from "drizzle-orm";
import type { DbConnection } from "@/server/db/client";
import { categories, people, type Category, type NewCategory, type NewPerson, type Person } from "@/server/db/schema";

export const starterPeople: NewPerson[] = [
  {
    id: "person_unassigned",
    slug: "unassigned",
    name: "Unassigned",
    kind: "system",
    initials: "-",
    color: "#7b8794",
    sortOrder: 0,
  },
  {
    id: "person_ryan",
    slug: "ryan",
    name: "Ryan",
    kind: "human",
    initials: "R",
    color: "#167c80",
    sortOrder: 1,
  },
  {
    id: "person_caroline",
    slug: "caroline",
    name: "Caroline",
    kind: "human",
    initials: "C",
    color: "#d65a31",
    sortOrder: 2,
  },
];

export const starterCategories: NewCategory[] = [
  {
    id: "cat_house",
    slug: "house",
    name: "House",
    color: "#2f6f4e",
    icon: "home",
    sortOrder: 1,
  },
  {
    id: "cat_sell_donate",
    slug: "sell-donate",
    name: "Sell/Donate",
    color: "#7c32ff",
    icon: "tag",
    sortOrder: 2,
  },
  {
    id: "cat_errands",
    slug: "errands",
    name: "Errands",
    color: "#b5651d",
    icon: "route",
    sortOrder: 3,
  },
  {
    id: "cat_kai",
    slug: "kai",
    name: "Kai",
    color: "#17b5ad",
    icon: "user",
    sortOrder: 4,
  },
];

export class CatalogRepository {
  constructor(private readonly conn: DbConnection) {}

  async listPeople(): Promise<Person[]> {
    return this.conn.db.select().from(people).orderBy(asc(people.sortOrder), asc(people.name));
  }

  async listCategories(): Promise<Category[]> {
    return this.conn.db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async findPersonBySlug(slug: string): Promise<Person | undefined> {
    const [person] = await this.conn.db.select().from(people).where(eq(people.slug, slug)).limit(1);
    return person;
  }

  async findCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await this.conn.db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return category;
  }

  async seedStarterData() {
    for (const person of starterPeople) {
      await this.conn.db.insert(people).values(person).onConflictDoUpdate({
        target: people.slug,
        set: {
          name: person.name,
          kind: person.kind,
          initials: person.initials,
          color: person.color,
          sortOrder: person.sortOrder,
        },
      });
    }

    for (const category of starterCategories) {
      await this.conn.db.insert(categories).values(category).onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: category.name,
          color: category.color,
          icon: category.icon,
          sortOrder: category.sortOrder,
        },
      });
    }
  }
}
