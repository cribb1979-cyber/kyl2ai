import { getDb } from "../client";

export type Store = {
  id: number;
  name: string;
  lat: number | null;
  lng: number | null;
  department_order: number[];
};

type StoreRow = { id: number; name: string; lat: number | null; lng: number | null; department_order: string };

function parseRow(row: StoreRow): Store {
  return { ...row, department_order: JSON.parse(row.department_order) };
}

export async function listStores(): Promise<Store[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StoreRow>(`SELECT * FROM stores ORDER BY name ASC;`);
  return rows.map(parseRow);
}

export async function getStore(id: number): Promise<Store | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<StoreRow>(`SELECT * FROM stores WHERE id = ?;`, [id]);
  return row ? parseRow(row) : null;
}

export async function createStore(name: string, lat?: number, lng?: number): Promise<number> {
  const db = await getDb();
  const departments = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM departments ORDER BY sort_order ASC;`
  );
  const defaultOrder = JSON.stringify(departments.map((d) => d.id));
  const result = await db.runAsync(
    `INSERT INTO stores (name, lat, lng, department_order) VALUES (?, ?, ?, ?);`,
    [name, lat ?? null, lng ?? null, defaultOrder]
  );
  return result.lastInsertRowId;
}

export async function updateDepartmentOrder(storeId: number, departmentIds: number[]): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE stores SET department_order = ? WHERE id = ?;`, [
    JSON.stringify(departmentIds),
    storeId,
  ]);
}

export async function deleteStore(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM stores WHERE id = ?;`, [id]);
}

export async function listDepartments() {
  const db = await getDb();
  return db.getAllAsync<{ id: number; name: string; sort_order: number }>(
    `SELECT * FROM departments ORDER BY sort_order ASC;`
  );
}
