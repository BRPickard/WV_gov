import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderAccessRow } from "@/components/person-access";
import { getUser, listFolderAccessForUser } from "@/lib/access";
import { requireAdmin } from "@/lib/session";

export default async function ManagePersonAccessPage({ params }: PageProps<"/admin/people/[userId]">) {
  await requireAdmin();
  const { userId } = await params;
  const person = getUser(userId);

  if (!person) notFound();

  const folders = listFolderAccessForUser(userId);
  const isAdmin = person.role === "admin";
  const grantedCount = folders.filter((folder) => folder.permission).length;

  return (
    <div>
      <Link href="/admin" className="subtle mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <span aria-hidden>←</span> Administration
      </Link>

      <div className="mb-8">
        <h1 className="page-title">{person.name}</h1>
        <p className="subtle mt-1">
          {person.email}
          {isAdmin
            ? " · administrator — full access to every folder"
            : ` · ${grantedCount} of ${folders.length} folders`}
        </p>
      </div>

      {isAdmin ? (
        <div className="card p-10 text-center">
          <p className="font-medium text-ink">Administrators can see everything</p>
          <p className="subtle mx-auto mt-1 max-w-md">
            {person.name} has an administrator role, so every folder is already available. Change the role
            to Member on the Administration page to grant folders individually.
          </p>
        </div>
      ) : (
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
                <FolderAccessRow
                  key={folder.id}
                  userId={userId}
                  folderId={folder.id}
                  folderName={folder.name}
                  permission={folder.permission}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isAdmin && folders.length === 0 && (
        <p className="subtle mt-4">No folders exist yet. Create one on the Administration page.</p>
      )}
    </div>
  );
}
