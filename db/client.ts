import * as SQLite from "expo-sqlite";
import { migrate } from "./schema";
import { seedIfEmpty } from "./seed/shelfLifeData";

const DB_NAME = "kyl2ai.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrate(db);
  await seedIfEmpty(db);
  return db;
}

/** Lazily opens (once) and returns the shared app database connection. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open();
  }
  return dbPromise;
}
