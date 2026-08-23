"use client";

import { useState, useTransition } from "react";
import {
  setAllFoldersAccessAction,
  setPersonFolderAccessAction,
} from "@/app/(app)/admin/actions";
import type { Permission } from "@/lib/types";

type Access = Permission | "none";
type FolderAccess = { id: string; name: string; permission: Permission | null };

const OPTIONS: { value: Access; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View only" },
  { value: "edit", label: "Can edit" },
];

export function PersonAccessTable({
  userId,
  initialFolders,
}: {
  userId: string;
  initialFolders: FolderAccess[];
}) {
  const [folders, setFolders] = useState<FolderAccess[]>(initialFolders);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const grantedCount = folders.filter((folder) => folder.permission).length;

  function persist(action: () => Promise<{ error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      setNote(result.error ?? "Saved");
    });
  }

  function changeOne(folderId: string, access: Access) {
    setBusyId(folderId);
    setFolders((current) =>
      current.map((folder) =>
        folder.id === folderId ? { ...folder, permission: access === "none" ? null : access } : folder,
      ),
    );
    persist(async () => {
      const data = new FormData();
      data.set("userId", userId);
      data.set("folderId", folderId);
      data.set("access", access);
      const result = await setPersonFolderAccessAction({}, data);
      setBusyId(null);
      return result;
    });
  }

  function changeAll(access: Access) {
    setFolders((current) =>
      current.map((folder) => ({ ...folder, permission: access === "none" ? null : access })),
    );
    persist(async () => {
      const data = new FormData();
      data.set("userId", userId);
      data.set("access", access);
      return setAllFoldersAccessAction({}, data);
    });
  }

  return (
    <div>
      {/* bulk bar */}
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium text-ink">Set all folders to</span>
        <div className="flex gap-2">
          <button className="btn" disabled={pending} onClick={() => changeAll("view")}>
            View only
          </button>
          <button className="btn" disabled={pending} onClick={() => changeAll("edit")}>
            Can edit
          </button>
          <button className="btn" disabled={pending} onClick={() => changeAll("none")}>
            No access
          </button>
        </div>
        <span className="ml-auto text-xs text-muted">
          {pending ? "Saving…" : note ?? `${grantedCount} of ${folders.length} folders`}
        </span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Folder</th>
              <th className="px-5 py-3 text-right font-medium">Access</th>
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => (
              <tr key={folder.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2">
                    <FolderGlyph />
                    <span className="font-medium text-ink">{folder.name}</span>
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {busyId === folder.id && pending && (
                      <span className="text-xs text-muted">Saving…</span>
                    )}
                    <select
                      className="input mt-0 w-36 py-1.5"
                      value={folder.permission ?? "none"}
                      disabled={pending}
                      onChange={(event) => changeOne(folder.id, event.target.value as Access)}
                    >
                      {OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path
        fill="#f7c66b"
        d="M2.5 6.5A1.5 1.5 0 0 1 4 5h4.6a1.5 1.5 0 0 1 1.1.5l1.2 1.3H20a1.5 1.5 0 0 1 1.5 1.5v9.2A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5Z"
      />
      <path fill="#ffdf9e" d="M2.5 9.3h19v8.2A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5Z" />
    </svg>
  );
}
