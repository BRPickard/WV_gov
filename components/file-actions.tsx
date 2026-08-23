"use client";

import { useActionState, useRef, useState } from "react";
import {
  createSpreadsheetAction,
  uploadFileAction,
  type ActionState,
} from "@/app/(app)/folders/actions";
import { ALLOWED_ACCEPT_ATTRIBUTE } from "@/lib/files";

const empty: ActionState = {};

export function NewSpreadsheetForm({ folderId }: { folderId: string }) {
  const [state, action, pending] = useActionState(createSpreadsheetAction, empty);
  const [name, setName] = useState("");

  return (
    <form
      action={(formData) => {
        action(formData);
        setName("");
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="folderId" value={folderId} />
      <input
        className="input mt-0 w-44 py-1.5"
        name="name"
        required
        placeholder="New workbook name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Creating…" : "New"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function UploadFileForm({ folderId }: { folderId: string }) {
  const [state, action, pending] = useActionState(uploadFileAction, empty);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="folderId" value={folderId} />
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        name="file"
        accept={ALLOWED_ACCEPT_ATTRIBUTE}
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button className="btn" type="button" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? "Uploading…" : "Upload file"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
