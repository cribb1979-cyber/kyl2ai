import { getDb } from "../client";

export type FridgeEntry = {
  id: number;
  item_id: number;
  name: string;
  category: string;
  added_date: string;
  expiry_date: string;
  quantity: number;
  location: string;
  notified: number;
  days_left: number;
};

const SELECT_WITH_ITEM = `
  SELECT
    fe.id, fe.item_id, fe.added_date, fe.expiry_date, fe.quantity, fe.location, fe.notified,
    i.name, i.category,
    CAST(julianday(fe.expiry_date) - julianday('now', 'localtime') AS INTEGER) AS days_left
  FROM fridge_entries fe
  JOIN items i ON i.id = fe.item_id
`;

/** All fridge/pantry entries, soonest-expiring first. */
export async function listFridgeEntries(location?: string): Promise<FridgeEntry[]> {
  const db = await getDb();
  if (location) {
    return db.getAllAsync<FridgeEntry>(
      `${SELECT_WITH_ITEM} WHERE fe.location = ? ORDER BY fe.expiry_date ASC;`,
      [location]
    );
  }
  return db.getAllAsync<FridgeEntry>(`${SELECT_WITH_ITEM} ORDER BY fe.expiry_date ASC;`);
}

/** Entries expiring within `withinDays` days (including already-expired ones). */
export async function listExpiringSoon(withinDays = 3): Promise<FridgeEntry[]> {
  const db = await getDb();
  return db.getAllAsync<FridgeEntry>(
    `${SELECT_WITH_ITEM}
     WHERE julianday(fe.expiry_date) - julianday('now', 'localtime') <= ?
     ORDER BY fe.expiry_date ASC;`,
    [withinDays]
  );
}

export async function getFridgeEntry(id: number): Promise<FridgeEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<FridgeEntry>(`${SELECT_WITH_ITEM} WHERE fe.id = ?;`, [id]);
  return row ?? null;
}

export async function addFridgeEntry(params: {
  itemId: number;
  quantity: number;
  location: string;
  shelfLifeDays: number;
  addedDate?: string;
}): Promise<number> {
  const db = await getDb();
  const addedDate = params.addedDate ?? new Date().toISOString().slice(0, 10);
  const expiryDate = addDays(addedDate, params.shelfLifeDays);
  const result = await db.runAsync(
    `INSERT INTO fridge_entries (item_id, added_date, expiry_date, quantity, location)
     VALUES (?, ?, ?, ?, ?);`,
    [params.itemId, addedDate, expiryDate, params.quantity, params.location]
  );
  await db.runAsync(
    `INSERT INTO purchase_history (item_id, purchased_date) VALUES (?, ?);`,
    [params.itemId, addedDate]
  );
  return result.lastInsertRowId;
}

export async function updateFridgeEntry(
  id: number,
  changes: Partial<Pick<FridgeEntry, "expiry_date" | "quantity" | "location">>
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(changes);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (changes as Record<string, unknown>)[f]) as (string | number)[];
  await db.runAsync(`UPDATE fridge_entries SET ${setClause} WHERE id = ?;`, [...values, id]);
}

export async function removeFridgeEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM fridge_entries WHERE id = ?;`, [id]);
}

export async function findOrCreateItem(params: {
  name: string;
  category: string;
  defaultShelfLifeDays: number;
}): Promise<{ id: number; default_shelf_life_days: number }> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: number; default_shelf_life_days: number }>(
    `SELECT id, default_shelf_life_days FROM items WHERE name = ? COLLATE NOCASE;`,
    [params.name]
  );
  if (existing) return existing;
  const result = await db.runAsync(
    `INSERT INTO items (name, category, default_shelf_life_days) VALUES (?, ?, ?);`,
    [params.name, params.category, params.defaultShelfLifeDays]
  );
  return { id: result.lastInsertRowId, default_shelf_life_days: params.defaultShelfLifeDays };
}

export async function searchItems(query: string) {
  const db = await getDb();
  return db.getAllAsync<{ id: number; name: string; category: string; default_shelf_life_days: number }>(
    `SELECT id, name, category, default_shelf_life_days FROM items
     WHERE name LIKE ? COLLATE NOCASE ORDER BY name ASC LIMIT 20;`,
    [`%${query}%`]
  );
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
