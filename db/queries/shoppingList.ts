import { getDb } from "../client";

export type ShoppingListRow = {
  id: number;
  item_id: number;
  name: string;
  category: string;
  checked: number;
  added_date: string;
  department_name: string | null;
  department_sort_order: number | null;
};

const SELECT_WITH_ITEM = `
  SELECT
    sl.id, sl.item_id, sl.checked, sl.added_date,
    i.name, i.category,
    d.name AS department_name, d.sort_order AS department_sort_order
  FROM shopping_list sl
  JOIN items i ON i.id = sl.item_id
  LEFT JOIN departments d ON d.id = i.department_id
`;

/** Shopping list grouped implicitly by department sort order, unchecked first. */
export async function listShoppingList(): Promise<ShoppingListRow[]> {
  const db = await getDb();
  return db.getAllAsync<ShoppingListRow>(
    `${SELECT_WITH_ITEM}
     ORDER BY sl.checked ASC, COALESCE(d.sort_order, 999) ASC, i.name ASC;`
  );
}

export async function addToShoppingList(itemId: number): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM shopping_list WHERE item_id = ? AND checked = 0;`,
    [itemId]
  );
  if (existing) return;
  await db.runAsync(
    `INSERT INTO shopping_list (item_id, checked, added_date) VALUES (?, 0, ?);`,
    [itemId, new Date().toISOString().slice(0, 10)]
  );
}

export async function setChecked(id: number, checked: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE shopping_list SET checked = ? WHERE id = ?;`, [checked ? 1 : 0, id]);
}

export async function removeFromShoppingList(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM shopping_list WHERE id = ?;`, [id]);
}

export async function clearChecked(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM shopping_list WHERE checked = 1;`);
}
