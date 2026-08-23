import Link from "next/link";
import {
  CreateFolderForm,
  CreateUserForm,
  DeleteFolderButton,
  DeleteUserButton,
  ResetPasswordForm,
  RoleSelect,
} from "@/components/admin-forms";
import { listFoldersForUser, listUsers } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import type { Role } from "@/lib/types";

export const metadata = { title: "Admin · WV Document Library" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const users = listUsers();
  const folders = listFoldersForUser(admin);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="page-title">Administration</h1>
        <p className="subtle mt-1">Issue accounts, create folders, and decide who sees what.</p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Folders</h2>

        <div className="card mb-4 p-5">
          <CreateFolderForm />
        </div>

        {folders.length === 0 ? (
          <p className="subtle">No folders yet.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Folder</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Files</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {folders.map((folder) => (
                  <tr key={folder.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{folder.name}</p>
                      {folder.description && <p className="subtle">{folder.description}</p>}
                    </td>
                    <td className="hidden px-5 py-3 text-muted sm:table-cell">{folder.workbookCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link className="btn btn-ghost" href={`/admin/folders/${folder.id}`}>
                          Manage access
                        </Link>
                        <DeleteFolderButton folderId={folder.id} name={folder.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">People</h2>

        <div className="card mb-4 p-5">
          <CreateUserForm />
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Added</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === admin.id;
                return (
                  <tr key={user.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">
                        {user.name}
                        {isSelf && <span className="subtle"> (you)</span>}
                      </p>
                      <p className="subtle">{user.email}</p>
                    </td>
                    <td className="hidden px-5 py-3 text-muted md:table-cell">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3">
                      <RoleSelect userId={user.id} role={user.role as Role} disabled={isSelf} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <ResetPasswordForm userId={user.id} />
                        <DeleteUserButton userId={user.id} name={user.name} disabled={isSelf} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
