import Link from "next/link";
import { notFound } from "next/navigation";
import { GrantAccessForm, MemberPermissionControls } from "@/components/admin-forms";
import { getFolderForUser, listFiles, listFolderMembers, listUsers } from "@/lib/access";
import { requireAdmin } from "@/lib/session";

export default async function ManageFolderAccessPage({ params }: PageProps<"/admin/folders/[folderId]">) {
  const { folderId } = await params;
  const admin = await requireAdmin();
  const access = getFolderForUser(admin, folderId);

  if (!access) notFound();

  const members = listFolderMembers(folderId);
  const memberIds = new Set(members.map((member) => member.userId));
  const candidates = listUsers().filter((user) => !memberIds.has(user.id));
  const files = listFiles(folderId);

  return (
    <div>
      <Link href="/admin" className="subtle mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <span aria-hidden>←</span> Administration
      </Link>

      <div className="mb-8">
        <h1 className="page-title">{access.folder.name}</h1>
        <p className="subtle mt-1">
          {files.length} {files.length === 1 ? "file" : "files"} · administrators always have full
          access.
        </p>
      </div>

      <div className="card mb-6 p-5">
        <GrantAccessForm folderId={folderId} candidates={candidates} />
      </div>

      {members.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium text-ink">No one has been given access yet</p>
          <p className="subtle mt-1">Grant access above and this folder appears on their dashboard.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Person</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{member.name}</p>
                    <p className="subtle">{member.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <MemberPermissionControls
                      folderId={folderId}
                      userId={member.userId}
                      permission={member.permission}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
