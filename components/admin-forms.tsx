"use client";

import { useActionState, useState } from "react";
import {
  createFolderAction,
  createUserActionHandler,
  deleteFolderAction,
  deleteUserAction,
  grantAccessAction,
  resetPasswordAction,
  revokeAccessAction,
  setUserRoleAction,
  type ActionState,
} from "@/app/(app)/admin/actions";
import type { Permission, Role } from "@/lib/types";

const empty: ActionState = {};

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.message) return <p className="text-sm text-emerald-700">{state.message}</p>;
  return null;
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserActionHandler, empty);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="new-user-name">
          Full name
        </label>
        <input id="new-user-name" className="input" name="name" required placeholder="Dana Reed" />
      </div>
      <div>
        <label className="label" htmlFor="new-user-email">
          Email
        </label>
        <input id="new-user-email" className="input" name="email" type="email" required placeholder="dana@wv.gov" />
      </div>
      <div>
        <label className="label" htmlFor="new-user-password">
          Temporary password
        </label>
        <input
          id="new-user-password"
          className="input"
          name="password"
          type="text"
          required
          minLength={10}
          placeholder="At least 10 characters"
        />
      </div>
      <div>
        <label className="label" htmlFor="new-user-role">
          Role
        </label>
        <select id="new-user-role" className="input" name="role" defaultValue="member">
          <option value="member">Member</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: Role; disabled: boolean }) {
  const [state, action] = useActionState(setUserRoleAction, empty);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        className="input mt-0 w-36 py-1.5"
        name="role"
        defaultValue={role}
        disabled={disabled}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="member">Member</option>
        <option value="admin">Administrator</option>
      </select>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, empty);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        Reset password
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input
        className="input mt-0 w-52 py-1.5"
        name="password"
        type="text"
        required
        minLength={10}
        placeholder="New password"
        autoFocus
      />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set"}
      </button>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
        Cancel
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteUserButton({ userId, name, disabled }: { userId: string; name: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(deleteUserAction, empty);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(`Remove ${name}'s account? Their folder access is removed too.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button className="btn btn-danger" type="submit" disabled={pending || disabled} title={state.error ?? ""}>
        {pending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}

export function CreateFolderForm() {
  const [state, action, pending] = useActionState(createFolderAction, empty);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="folder-name">
          Folder name
        </label>
        <input id="folder-name" className="input" name="name" required placeholder="Budget FY26" />
      </div>
      <div>
        <label className="label" htmlFor="folder-description">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="folder-description" className="input" name="description" placeholder="Quarterly budget workbooks" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create folder"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function DeleteFolderButton({ folderId, name }: { folderId: string; name: string }) {
  const [, action, pending] = useActionState(deleteFolderAction, empty);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(`Delete "${name}" and every file listed in it?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="folderId" value={folderId} />
      <button className="btn btn-danger" type="submit" disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}

export function GrantAccessForm({
  folderId,
  candidates,
}: {
  folderId: string;
  candidates: { id: string; name: string; email: string }[];
}) {
  const [state, action, pending] = useActionState(grantAccessAction, empty);

  if (candidates.length === 0) {
    return <p className="subtle">Everyone with an account already has access to this folder.</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="folderId" value={folderId} />
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor="grant-user">
          Person
        </label>
        <select id="grant-user" className="input" name="userId" required defaultValue="">
          <option value="" disabled>
            Choose someone…
          </option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} · {candidate.email}
            </option>
          ))}
        </select>
      </div>
      <div className="w-44">
        <label className="label" htmlFor="grant-permission">
          Access
        </label>
        <select id="grant-permission" className="input" name="permission" defaultValue="view">
          <option value="view">View only</option>
          <option value="edit">Can edit</option>
        </select>
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Granting…" : "Grant access"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function MemberPermissionControls({
  folderId,
  userId,
  permission,
}: {
  folderId: string;
  userId: string;
  permission: Permission;
}) {
  const [, grant] = useActionState(grantAccessAction, empty);
  const [, revoke, revoking] = useActionState(revokeAccessAction, empty);

  return (
    <div className="flex items-center justify-end gap-2">
      <form action={grant}>
        <input type="hidden" name="folderId" value={folderId} />
        <input type="hidden" name="userId" value={userId} />
        <select
          className="input mt-0 w-32 py-1.5"
          name="permission"
          defaultValue={permission}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="view">View only</option>
          <option value="edit">Can edit</option>
        </select>
      </form>
      <form action={revoke}>
        <input type="hidden" name="folderId" value={folderId} />
        <input type="hidden" name="userId" value={userId} />
        <button className="btn btn-danger" type="submit" disabled={revoking}>
          {revoking ? "Removing…" : "Revoke"}
        </button>
      </form>
    </div>
  );
}
