"use server";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { deleteFileRecord, getFileForUser, getFolderForUser, registerFile } from "@/lib/access";
import { createWorkbookFile, readWorkbookFile } from "@/lib/excel";
import { ALLOWED_EXTENSIONS_LABEL, extensionOf, isAllowedFile, kindOf } from "@/lib/files";
import { requireAdmin } from "@/lib/session";
import { MAX_UPLOAD_BYTES, cleanFileName, removeStoredFile, storagePath } from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

/** Creates an empty spreadsheet in a folder. Administrators only. */
export async function createSpreadsheetAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const folderId = String(formData.get("folderId") ?? "");
  const access = getFolderForUser(user, folderId);

  if (!access) return { error: "That folder does not exist." };

  const name = cleanFileName(`${String(formData.get("name") ?? "").replace(/\.xlsx$/i, "")}.xlsx`, ".xlsx");
  const storageName = `${randomUUID()}.xlsx`;

  try {
    await createWorkbookFile(storagePath(storageName));
    const { size } = await fs.stat(storagePath(storageName));
    registerFile({ folderId, name, storageName, sizeBytes: size, userId: user.id });
  } catch (error) {
    await removeStoredFile(storageName);
    if (isDuplicateNameError(error)) return { error: "A file with that name already exists here." };
    throw error;
  }

  revalidatePath(`/folders/${folderId}`);
  revalidatePath("/folders");
  return { ok: true };
}

/** Uploads a file into a folder. Administrators only. */
export async function uploadFileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const folderId = String(formData.get("folderId") ?? "");
  const access = getFolderForUser(user, folderId);

  if (!access) return { error: "That folder does not exist." };

  const upload = formData.get("file");
  if (!(upload instanceof File) || upload.size === 0) return { error: "Choose a file to upload." };
  if (!isAllowedFile(upload.name)) return { error: `Supported file types: ${ALLOWED_EXTENSIONS_LABEL}.` };
  if (upload.size > MAX_UPLOAD_BYTES) return { error: "That file is larger than the 10 MB limit." };

  const name = cleanFileName(upload.name);
  const storageName = `${randomUUID()}${extensionOf(name)}`;
  const destination = storagePath(storageName);
  await fs.writeFile(destination, Buffer.from(await upload.arrayBuffer()));

  try {
    // Spreadsheets have to open in the editor, so prove they parse before the
    // upload is accepted. Other file types are stored verbatim.
    if (kindOf(name) === "spreadsheet") await readWorkbookFile(destination);
    registerFile({ folderId, name, storageName, sizeBytes: upload.size, userId: user.id });
  } catch (error) {
    await removeStoredFile(storageName);
    if (isDuplicateNameError(error)) return { error: "A file with that name already exists here." };
    return { error: "That file could not be read as an Excel workbook." };
  }

  revalidatePath(`/folders/${folderId}`);
  revalidatePath("/folders");
  return { ok: true };
}

export async function deleteFileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  const fileId = String(formData.get("fileId") ?? "");
  const found = getFileForUser(user, fileId);

  if (!found) return { error: "That file does not exist." };

  deleteFileRecord(fileId);
  await removeStoredFile(found.file.storageName);

  revalidatePath(`/folders/${found.folder.id}`);
  revalidatePath("/folders");
  return { ok: true };
}

function isDuplicateNameError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed: file");
}
