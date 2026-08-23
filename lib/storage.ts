import fs from "node:fs/promises";
import path from "node:path";
import { FILES_DIR } from "./db";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Resolves a stored file, refusing anything that escapes the files directory. */
export function workbookPath(storageName: string): string {
  const resolved = path.resolve(FILES_DIR, path.basename(storageName));
  if (!resolved.startsWith(path.resolve(FILES_DIR) + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

export async function removeWorkbookFile(storageName: string) {
  await fs.rm(workbookPath(storageName), { force: true });
}

export async function fileSize(storageName: string): Promise<number> {
  const stat = await fs.stat(workbookPath(storageName));
  return stat.size;
}

/** Trims a user-supplied workbook name down to something safe to display. */
export function cleanWorkbookName(input: string): string {
  const base = input.replace(/\.xlsx$/i, "").replace(/[\\/:*?"<>|]/g, " ").trim();
  return `${base.slice(0, 80) || "Untitled"}.xlsx`;
}
