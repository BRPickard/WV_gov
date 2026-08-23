"use client";

import { useActionState } from "react";
import { deleteWorkbookAction, type ActionState } from "@/app/(app)/folders/actions";

const empty: ActionState = {};

export default function DeleteWorkbookButton({ workbookId, name }: { workbookId: string; name: string }) {
  const [state, action, pending] = useActionState(deleteWorkbookAction, empty);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="workbookId" value={workbookId} />
      <button className="btn btn-danger" type="submit" disabled={pending} title={state.error ?? "Delete file"}>
        {pending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}
