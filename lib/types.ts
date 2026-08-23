export type Permission = "view" | "edit";
export type Role = "admin" | "member";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Folder = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string | null;
};

/** A folder plus what the current user is allowed to do inside it. */
export type FolderWithAccess = Folder & {
  permission: Permission;
  workbookCount: number;
};

export type Workbook = {
  id: string;
  folderId: string;
  name: string;
  storageName: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
};

/** A single worksheet flattened to a rectangular grid of display strings. */
export type SheetData = {
  name: string;
  rows: string[][];
};

export type WorkbookData = {
  sheets: SheetData[];
};
