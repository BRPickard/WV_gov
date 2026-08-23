/** Application tables, applied on every boot (see lib/db.ts). */
export const APP_SCHEMA = `
-- Better Auth owns "user", "session", "account" and "verification"; those are
-- created by "npm run db:migrate" (scripts/migrate.mts) straight from the auth
-- config so they can never drift from the library version in package.json.
CREATE TABLE IF NOT EXISTS folder (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  createdAt   TEXT NOT NULL,
  createdBy   TEXT
);

-- One row per (folder, user) grant. No row means the folder is invisible to
-- that user: every folder query joins through this table.
CREATE TABLE IF NOT EXISTS folder_access (
  id         TEXT PRIMARY KEY,
  folderId   TEXT NOT NULL REFERENCES folder (id) ON DELETE CASCADE,
  userId     TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  createdAt  TEXT NOT NULL,
  UNIQUE (folderId, userId)
);

CREATE INDEX IF NOT EXISTS folder_access_userId_idx ON folder_access (userId);
CREATE INDEX IF NOT EXISTS folder_access_folderId_idx ON folder_access (folderId);

-- A file inside a folder. The bytes live at DATA_DIR/files/<storageName>.
-- kind = 'spreadsheet' opens in the grid editor; 'document' is stored and
-- downloaded as-is.
CREATE TABLE IF NOT EXISTS file (
  id          TEXT PRIMARY KEY,
  folderId    TEXT NOT NULL REFERENCES folder (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  storageName TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('spreadsheet', 'document')),
  contentType TEXT NOT NULL,
  sizeBytes   INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL,
  updatedBy   TEXT,
  UNIQUE (folderId, name)
);

CREATE INDEX IF NOT EXISTS file_folderId_idx ON file (folderId);
`;
