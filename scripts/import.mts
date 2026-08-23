/**
 * Imports a directory of folders into the library:
 *
 *   npm run import -- ./path/to/tree
 *
 * Each top-level directory becomes a folder; the files inside it become that
 * folder's files. Re-running is safe — folders and files that already exist
 * are left alone unless --replace is passed, which overwrites files whose name
 * already exists in the folder.
 *
 * Imported folders start with no access grants, so only administrators can see
 * them until access is handed out from the admin console. That is deliberate:
 * nothing in a directory tree says who should be allowed to read it.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createFolder, listFiles, listUsers, registerFile } from "../lib/access";
import { db } from "../lib/db";
import { readWorkbookFile } from "../lib/excel";
import { ALLOWED_EXTENSIONS_LABEL, extensionOf, isAllowedFile, kindOf } from "../lib/files";
import { MAX_UPLOAD_BYTES, cleanFileName, storagePath } from "../lib/storage";
import type { Folder } from "../lib/types";

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const root = args.find((arg) => !arg.startsWith("--"));

if (!root) {
  console.error("Usage: npm run import -- <directory> [--replace]");
  process.exit(1);
}
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Not a directory: ${root}`);
  process.exit(1);
}

const admin = listUsers().find((user) => user.role === "admin");
if (!admin) {
  console.error("No administrator account exists yet. Run `npm run seed` first, or create one.");
  process.exit(1);
}

let created = 0;
let skipped = 0;
const warnings: string[] = [];

for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) {
    warnings.push(`skipped loose file at the top level: ${entry.name}`);
    continue;
  }

  const folderName = entry.name.trim();
  const existing = db.prepare(`SELECT * FROM folder WHERE name = ?`).get(folderName) as Folder | undefined;
  const folder = existing ?? createFolder(folderName, "", admin.id);
  console.log(`${existing ? "·" : "✓"} folder ${folderName}`);

  const present = new Map(listFiles(folder.id).map((file) => [file.name, file]));
  const sourceDir = path.join(root, entry.name);

  for (const child of fs.readdirSync(sourceDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (child.isDirectory()) {
      warnings.push(`${folderName}: skipped nested directory "${child.name}" (folders do not nest)`);
      continue;
    }
    if (child.name.startsWith("~$") || child.name.startsWith(".")) continue; // Office lock files

    const source = path.join(sourceDir, child.name);
    const name = cleanFileName(child.name);

    if (!isAllowedFile(name)) {
      warnings.push(`${folderName}/${child.name}: unsupported type (allowed: ${ALLOWED_EXTENSIONS_LABEL})`);
      continue;
    }

    const size = fs.statSync(source).size;
    if (size > MAX_UPLOAD_BYTES) {
      warnings.push(`${folderName}/${child.name}: ${(size / 1e6).toFixed(1)} MB exceeds the 10 MB limit`);
      continue;
    }

    const already = present.get(name);
    if (already && !replace) {
      skipped++;
      continue;
    }

    const storageName = `${randomUUID()}${extensionOf(name)}`;
    fs.copyFileSync(source, storagePath(storageName));

    // Prove a spreadsheet opens before it is listed as one, so a file that the
    // editor cannot read never reaches a user as a broken page.
    if (kindOf(name) === "spreadsheet") {
      try {
        await readWorkbookFile(storagePath(storageName));
      } catch (error) {
        fs.rmSync(storagePath(storageName), { force: true });
        warnings.push(`${folderName}/${child.name}: not readable as a workbook (${(error as Error).message})`);
        continue;
      }
    }

    if (already) {
      fs.rmSync(storagePath(already.storageName), { force: true });
      db.prepare(`DELETE FROM file WHERE id = ?`).run(already.id);
    }

    registerFile({ folderId: folder.id, name, storageName, sizeBytes: size, userId: admin.id });
    console.log(`    ${already ? "replaced" : "added"} ${name}`);
    created++;
  }
}

console.log(`\n${created} file(s) imported, ${skipped} already present.`);
if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const warning of warnings) console.log(`  ! ${warning}`);
}
console.log("\nImported folders have no access grants yet — assign them under /admin.");
process.exit(0);
