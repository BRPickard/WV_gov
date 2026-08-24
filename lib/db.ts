import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { APP_SCHEMA } from "./schema";

/**
 * A single SQLite file holds everything: Better Auth's tables and the app's
 * folder / permission / file records. The .xlsx files themselves live on disk
 * under DATA_DIR/files.
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
export const FILES_DIR = path.join(DATA_DIR, "files");
const DB_PATH = path.join(DATA_DIR, "app.db");

fs.mkdirSync(FILES_DIR, { recursive: true });

const globalForDb = globalThis as unknown as { __db?: Database.Database };

function createDb() {
  const db = new Database(DB_PATH);
  // WAL is best on a local disk. Over a network share (Azure Files / SMB) its
  // shared-memory file is unreliable, so set SQLITE_JOURNAL_MODE=DELETE there.
  const journalMode = process.env.SQLITE_JOURNAL_MODE ?? "WAL";
  db.pragma(`journal_mode = ${journalMode}`);
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

export const db = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

/** Idempotent schema creation — safe to run on every boot. */
function migrate(db: Database.Database) {
  db.exec(APP_SCHEMA);
}
