"use client";

import { useActionState } from "react";
import { deleteFileAction, type ActionState } from "@/app/(app)/folders/actions";

const empty: ActionState = {};

export default function DeleteFileButton({ fileId, name }: { fileId: string; name: string }) {
  const [state, action, pending] = useActionState(deleteFileAction, empty);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="fileId" value={fileId} />
      <button className="btn btn-danger" type="submit" disabled={pending} title={state.error ?? "Delete file"}>
        {pending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}
