"use server";

import { revalidatePath } from "next/cache";
import {
  createFolder,
  deleteFolder,
  revokeFolderAccess,
  setAllFoldersAccessForUser,
  setFolderAccess,
  setUserRole,
} from "@/lib/access";
import { requireAdmin } from "@/lib/session";
import { createUserAccount, deleteUserAccount, setUserPassword } from "@/lib/users";
import type { Permission, Role } from "@/lib/types";

export type ActionState = { error?: string; message?: string };

const asRole = (value: unknown): Role => (value === "admin" ? "admin" : "member");
const asPermission = (value: unknown): Permission => (value === "edit" ? "edit" : "view");

export async function createUserActionHandler(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const result = await createUserAccount({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: asRole(formData.get("role")),
  });

  if (result.error) return { error: result.error };

  revalidatePath("/admin");
  return { message: "Account created." };
}

export async function setUserRoleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (userId === admin.id) return { error: "You cannot change your own role." };

  setUserRole(userId, asRole(formData.get("role")));
  revalidatePath("/admin");
  return { message: "Role updated." };
}

export async function resetPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const result = await setUserPassword(
    String(formData.get("userId") ?? ""),
    String(formData.get("password") ?? ""),
  );

  if (result.error) return { error: result.error };
  return { message: "Password reset. The user has been signed out everywhere." };
}

export async function deleteUserAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (userId === admin.id) return { error: "You cannot delete your own account." };

  await deleteUserAccount(userId);
  revalidatePath("/admin");
  return { message: "Account removed." };
}

export async function createFolderAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();

  if (name === "") return { error: "A folder name is required." };

  try {
    createFolder(name, String(formData.get("description") ?? ""), admin.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return { error: "A folder with that name already exists." };
    }
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/folders");
  return { message: "Folder created." };
}

export async function deleteFolderAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  // Workbook rows cascade with the folder; the files themselves are left on
  // disk so a mistaken delete stays recoverable from a backup.
  deleteFolder(String(formData.get("folderId") ?? ""));

  revalidatePath("/admin");
  revalidatePath("/folders");
  return { message: "Folder deleted." };
}

export async function setPersonFolderAccessAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const folderId = String(formData.get("folderId") ?? "");
  if (!userId || !folderId) return { error: "Missing user or folder." };

  const access = String(formData.get("access") ?? "none");
  if (access === "none") revokeFolderAccess(folderId, userId);
  else setFolderAccess(folderId, userId, asPermission(access));

  revalidatePath(`/admin/people/${userId}`);
  revalidatePath("/folders");
  return { message: "Access updated." };
}

/** Sets one person's access on every folder at once (the "set all" control). */
export async function setAllFoldersAccessAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Missing user." };

  const access = String(formData.get("access") ?? "none");
  setAllFoldersAccessForUser(userId, access === "view" || access === "edit" ? access : "none");

  revalidatePath(`/admin/people/${userId}`);
  revalidatePath("/folders");
  return { message: "Access updated." };
}
