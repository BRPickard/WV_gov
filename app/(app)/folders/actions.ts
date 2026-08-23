"use server";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import {
  deleteWorkbookRecord,
  getFolderForUser,
  getWorkbookForUser,
  registerWorkbook,
} from "@/lib/access";
import { createWorkbookFile, readWorkbookFile } from "@/lib/excel";
import { requireUser } from "@/lib/session";
import { MAX_UPLOAD_BYTES, cleanWorkbookName, removeWorkbookFile, workbookPath } from "@/lib/storage";

export type ActionState = { error?: string; ok?: boolean };

/** Creates an empty workbook inside a folder the caller can edit. */
export async function createWorkbookAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const folderId = String(formData.get("folderId") ?? "");
  const access = getFolderForUser(user, folderId);

  if (!access || access.permission !== "edit") return { error: "You cannot add files to this folder." };

  const name = cleanWorkbookName(String(formData.get("name") ?? ""));
  const storageName = `${randomUUID()}.xlsx`;

  try {
    await createWorkbookFile(workbookPath(storageName));
    const size = (await fs.stat(workbookPath(storageName))).size;
    registerWorkbook({ folderId, name, storageName, sizeBytes: size, userId: user.id });
  } catch (error) {
    await removeWorkbookFile(storageName);
    if (isUniqueNameError(error)) return { error: "A file with that name already exists here." };
    throw error;
  }

  revalidatePath(`/folders/${folderId}`);
  revalidatePath("/folders");
  return { ok: true };
}

/** Uploads an existing .xlsx into a folder the caller can edit. */
export async function uploadWorkbookAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const folderId = String(formData.get("folderId") ?? "");
  const access = getFolderForUser(user, folderId);

  if (!access || access.permission !== "edit") return { error: "You cannot add files to this folder." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an .xlsx file to upload." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "Only .xlsx workbooks are supported." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "That file is larger than the 10 MB limit." };

  const storageName = `${randomUUID()}.xlsx`;
  const destination = workbookPath(storageName);
  await fs.writeFile(destination, Buffer.from(await file.arrayBuffer()));

  try {
    await readWorkbookFile(destination); // reject anything Excel cannot open
    registerWorkbook({
      folderId,
      name: cleanWorkbookName(file.name),
      storageName,
      sizeBytes: file.size,
      userId: user.id,
    });
  } catch (error) {
    await removeWorkbookFile(storageName);
    if (isUniqueNameError(error)) return { error: "A file with that name already exists here." };
    return { error: "That file could not be read as an Excel workbook." };
  }

  revalidatePath(`/folders/${folderId}`);
  revalidatePath("/folders");
  return { ok: true };
}

export async function deleteWorkbookAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const workbookId = String(formData.get("workbookId") ?? "");
  const found = getWorkbookForUser(user, workbookId);

  if (!found || found.permission !== "edit") return { error: "You cannot delete this file." };

  deleteWorkbookRecord(workbookId);
  await removeWorkbookFile(found.workbook.storageName);

  revalidatePath(`/folders/${found.folder.id}`);
  revalidatePath("/folders");
  return { ok: true };
}

function isUniqueNameError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed: workbook");
}
