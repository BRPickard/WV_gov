"use client";

import { useActionState } from "react";
import { setPersonFolderAccessAction, type ActionState } from "@/app/(app)/admin/actions";
import type { Permission } from "@/lib/types";

const empty: ActionState = {};

/** One folder row on the per-person access page: a three-way access selector. */
export function FolderAccessRow({
  userId,
  folderId,
  folderName,
  permission,
}: {
  userId: string;
  folderId: string;
  folderName: string;
  permission: Permission | null;
}) {
  const [state, action, pending] = useActionState(setPersonFolderAccessAction, empty);
  const value = permission ?? "none";

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-5 py-3">
        <span className="flex items-center gap-2">
          <FolderGlyph />
          <span className="font-medium text-ink">{folderName}</span>
        </span>
      </td>
      <td className="px-5 py-3">
        <form action={action} className="flex items-center justify-end gap-2">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="folderId" value={folderId} />
          <select
            name="access"
            className="input mt-0 w-36 py-1.5"
            defaultValue={value}
            disabled={pending}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            <option value="none">No access</option>
            <option value="view">View only</option>
            <option value="edit">Can edit</option>
          </select>
          {pending && <span className="text-xs text-muted">Saving…</span>}
          {!pending && state.message && <span className="text-xs text-emerald-700">Saved</span>}
          {state.error && <span className="text-xs text-red-600">{state.error}</span>}
        </form>
      </td>
    </tr>
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
