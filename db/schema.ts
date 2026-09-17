import type { SQLiteDatabase } from "expo-sqlite";

export const SCHEMA_VERSION = 1;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    default_shelf_life_days INTEGER NOT NULL DEFAULT 7
  );`,
  `CREATE TABLE IF NOT EXISTS fridge_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    added_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    location TEXT NOT NULL DEFAULT 'fridge',
    notified INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS purchase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    purchased_date TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS shopping_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    checked INTEGER NOT NULL DEFAULT 0,
    added_date TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL,
    lng REAL,
    department_order TEXT NOT NULL DEFAULT '[]'
  );`,
  `CREATE INDEX IF NOT EXISTS idx_fridge_entries_item ON fridge_entries(item_id);`,
  `CREATE INDEX IF NOT EXISTS idx_fridge_entries_expiry ON fridge_entries(expiry_date);`,
  `CREATE INDEX IF NOT EXISTS idx_purchase_history_item ON purchase_history(item_id);`,
  `CREATE INDEX IF NOT EXISTS idx_shopping_list_checked ON shopping_list(checked);`,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  for (const statement of STATEMENTS) {
    await db.execAsync(statement);
  }
}
