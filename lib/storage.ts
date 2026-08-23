import fs from "node:fs/promises";
import path from "node:path";
import { FILES_DIR } from "./db";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Resolves a stored file, refusing anything that escapes the files directory. */
export function storagePath(storageName: string): string {
  const resolved = path.resolve(FILES_DIR, path.basename(storageName));
  if (!resolved.startsWith(path.resolve(FILES_DIR) + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

export async function removeStoredFile(storageName: string) {
  await fs.rm(storagePath(storageName), { force: true });
}

export async function fileSize(storageName: string): Promise<number> {
  const stat = await fs.stat(storagePath(storageName));
  return stat.size;
}

/** Trims a user-supplied file name down to something safe to display. */
export function cleanFileName(input: string, fallbackExtension = ""): string {
  const name = input.replace(/[\\/:*?"<>|]/g, " ").trim();
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot).toLowerCase() : fallbackExtension;
  return `${base.slice(0, 80).trim() || "Untitled"}${extension}`;
}
