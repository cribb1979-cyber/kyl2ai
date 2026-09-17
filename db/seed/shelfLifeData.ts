import type { SQLiteDatabase } from "expo-sqlite";

export type SeedItem = {
  name: string;
  category: string;
  department: string;
  defaultShelfLifeDays: number;
};

/** Built-in shelf-life reference used to prefill new fridge/pantry entries. */
export const SHELF_LIFE_DATA: SeedItem[] = [
  { name: "Mjölk", category: "Mejeri", department: "Kylvaror", defaultShelfLifeDays: 7 },
  { name: "Yoghurt", category: "Mejeri", department: "Kylvaror", defaultShelfLifeDays: 14 },
  { name: "Smör", category: "Mejeri", department: "Kylvaror", defaultShelfLifeDays: 30 },
  { name: "Ägg", category: "Mejeri", department: "Kylvaror", defaultShelfLifeDays: 21 },
  { name: "Hårdost", category: "Mejeri", department: "Kylvaror", defaultShelfLifeDays: 21 },
  { name: "Grädde", category: "Mejeri", department: "Kylvaror", defaultShelfLifeDays: 10 },
  { name: "Kycklingfilé", category: "Kött & fisk", department: "Kött & chark", defaultShelfLifeDays: 2 },
  { name: "Nötfärs", category: "Kött & fisk", department: "Kött & chark", defaultShelfLifeDays: 2 },
  { name: "Bacon", category: "Kött & fisk", department: "Kött & chark", defaultShelfLifeDays: 7 },
  { name: "Lax", category: "Kött & fisk", department: "Kött & chark", defaultShelfLifeDays: 2 },
  { name: "Skinka", category: "Kött & fisk", department: "Kött & chark", defaultShelfLifeDays: 5 },
  { name: "Tomater", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 7 },
  { name: "Gurka", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 7 },
  { name: "Sallad", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 5 },
  { name: "Bananer", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 5 },
  { name: "Äpplen", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 21 },
  { name: "Morötter", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 21 },
  { name: "Paprika", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 10 },
  { name: "Lök", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 30 },
  { name: "Vitlök", category: "Frukt & grönt", department: "Frukt & grönt", defaultShelfLifeDays: 60 },
  { name: "Bröd", category: "Skafferi", department: "Bageri", defaultShelfLifeDays: 5 },
  { name: "Pasta", category: "Skafferi", department: "Skafferi", defaultShelfLifeDays: 730 },
  { name: "Ris", category: "Skafferi", department: "Skafferi", defaultShelfLifeDays: 730 },
  { name: "Konserverade tomater", category: "Skafferi", department: "Skafferi", defaultShelfLifeDays: 730 },
  { name: "Havregryn", category: "Skafferi", department: "Skafferi", defaultShelfLifeDays: 365 },
  { name: "Frysta grönsaker", category: "Frys", department: "Frys", defaultShelfLifeDays: 270 },
  { name: "Glass", category: "Frys", department: "Frys", defaultShelfLifeDays: 180 },
];

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM items;"
  );
  if (row && row.count > 0) return;

  const departmentNames = Array.from(new Set(SHELF_LIFE_DATA.map((d) => d.department)));

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < departmentNames.length; i++) {
      await db.runAsync(
        "INSERT OR IGNORE INTO departments (name, sort_order) VALUES (?, ?);",
        [departmentNames[i], i]
      );
    }

    for (const seed of SHELF_LIFE_DATA) {
      const dept = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM departments WHERE name = ?;",
        [seed.department]
      );
      await db.runAsync(
        "INSERT OR IGNORE INTO items (name, category, department_id, default_shelf_life_days) VALUES (?, ?, ?, ?);",
        [seed.name, seed.category, dept?.id ?? null, seed.defaultShelfLifeDays]
      );
    }
  });
}
