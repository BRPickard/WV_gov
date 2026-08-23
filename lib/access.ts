import { randomUUID } from "node:crypto";
import { db } from "./db";
import { contentTypeOf, kindOf } from "./files";
import type { Folder, FolderWithAccess, Permission, SessionUser, StoredFile } from "./types";

const now = () => new Date().toISOString();

/*
 * Every read below is scoped by the caller's identity. Administrators bypass
 * the folder_access join and implicitly hold 'edit' everywhere; everyone else
 * only ever sees rows they have been granted.
 */

export function listFoldersForUser(user: SessionUser): FolderWithAccess[] {
  if (user.role === "admin") {
    return db
      .prepare(
        `SELECT f.*, (SELECT COUNT(*) FROM file x WHERE x.folderId = f.id) AS fileCount
         FROM folder f ORDER BY f.name COLLATE NOCASE`,
      )
      .all()
      .map((row) => ({ ...(row as Folder & { fileCount: number }), permission: "edit" as Permission }));
  }

  return db
    .prepare(
      `SELECT f.*, a.permission,
              (SELECT COUNT(*) FROM file x WHERE x.folderId = f.id) AS fileCount
       FROM folder f
       JOIN folder_access a ON a.folderId = f.id AND a.userId = ?
       ORDER BY f.name COLLATE NOCASE`,
    )
    .all(user.id) as FolderWithAccess[];
}

/** Returns null when the folder does not exist *or* the user cannot see it. */
export function getFolderForUser(
  user: SessionUser,
  folderId: string,
): { folder: Folder; permission: Permission } | null {
  const folder = db.prepare(`SELECT * FROM folder WHERE id = ?`).get(folderId) as Folder | undefined;
  if (!folder) return null;

  if (user.role === "admin") return { folder, permission: "edit" };

  const grant = db
    .prepare(`SELECT permission FROM folder_access WHERE folderId = ? AND userId = ?`)
    .get(folderId, user.id) as { permission: Permission } | undefined;

  return grant ? { folder, permission: grant.permission } : null;
}

export type FileListing = StoredFile & { updatedByName: string | null };

export function listFiles(folderId: string): FileListing[] {
  return db
    .prepare(
      `SELECT x.*, u.name AS updatedByName
       FROM file x LEFT JOIN "user" u ON u.id = x.updatedBy
       WHERE x.folderId = ? ORDER BY x.name COLLATE NOCASE`,
    )
    .all(folderId) as FileListing[];
}

export function getFileForUser(
  user: SessionUser,
  fileId: string,
): { file: StoredFile; folder: Folder; permission: Permission } | null {
  const file = db.prepare(`SELECT * FROM file WHERE id = ?`).get(fileId) as StoredFile | undefined;
  if (!file) return null;

  const access = getFolderForUser(user, file.folderId);
  if (!access) return null;

  return { file, folder: access.folder, permission: access.permission };
}

/* ---------------------------------------------------------------- mutations */

export function createFolder(name: string, description: string, createdBy: string): Folder {
  const folder: Folder = {
    id: randomUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: now(),
    createdBy,
  };
  db.prepare(
    `INSERT INTO folder (id, name, description, createdAt, createdBy) VALUES (?, ?, ?, ?, ?)`,
  ).run(folder.id, folder.name, folder.description, folder.createdAt, folder.createdBy);
  return folder;
}

export function deleteFolder(folderId: string) {
  db.prepare(`DELETE FROM folder WHERE id = ?`).run(folderId);
}

export function setFolderAccess(folderId: string, userId: string, permission: Permission) {
  db.prepare(
    `INSERT INTO folder_access (id, folderId, userId, permission, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (folderId, userId) DO UPDATE SET permission = excluded.permission`,
  ).run(randomUUID(), folderId, userId, permission, now());
}

export function revokeFolderAccess(folderId: string, userId: string) {
  db.prepare(`DELETE FROM folder_access WHERE folderId = ? AND userId = ?`).run(folderId, userId);
}

export function listFolderMembers(folderId: string) {
  return db
    .prepare(
      `SELECT a.userId, a.permission, u.name, u.email
       FROM folder_access a JOIN "user" u ON u.id = a.userId
       WHERE a.folderId = ?
       ORDER BY u.name COLLATE NOCASE`,
    )
    .all(folderId) as { userId: string; permission: Permission; name: string; email: string }[];
}

export function listUsers() {
  return db
    .prepare(`SELECT id, name, email, COALESCE(role, 'member') AS role, createdAt FROM "user" ORDER BY name COLLATE NOCASE`)
    .all() as { id: string; name: string; email: string; role: string; createdAt: string }[];
}

export function setUserRole(userId: string, role: "admin" | "member") {
  db.prepare(`UPDATE "user" SET role = ?, updatedAt = ? WHERE id = ?`).run(role, now(), userId);
}

export function registerFile(input: {
  folderId: string;
  name: string;
  storageName: string;
  sizeBytes: number;
  userId: string;
}): StoredFile {
  const stamp = now();
  const file: StoredFile = {
    id: randomUUID(),
    folderId: input.folderId,
    name: input.name,
    storageName: input.storageName,
    kind: kindOf(input.name),
    contentType: contentTypeOf(input.name),
    sizeBytes: input.sizeBytes,
    createdAt: stamp,
    updatedAt: stamp,
    updatedBy: input.userId,
  };
  db.prepare(
    `INSERT INTO file (id, folderId, name, storageName, kind, contentType, sizeBytes, createdAt, updatedAt, updatedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    file.id,
    file.folderId,
    file.name,
    file.storageName,
    file.kind,
    file.contentType,
    file.sizeBytes,
    file.createdAt,
    file.updatedAt,
    file.updatedBy,
  );
  return file;
}

export function touchFile(fileId: string, sizeBytes: number, userId: string) {
  db.prepare(`UPDATE file SET updatedAt = ?, updatedBy = ?, sizeBytes = ? WHERE id = ?`).run(
    now(),
    userId,
    sizeBytes,
    fileId,
  );
}

export function deleteFileRecord(fileId: string) {
  db.prepare(`DELETE FROM file WHERE id = ?`).run(fileId);
}

export function getUserName(userId: string | null): string | null {
  if (!userId) return null;
  const row = db.prepare(`SELECT name FROM "user" WHERE id = ?`).get(userId) as { name: string } | undefined;
  return row?.name ?? null;
}
