import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteWorkbookButton from "@/components/delete-workbook-button";
import { NewWorkbookForm, UploadWorkbookForm } from "@/components/workbook-actions";
import { getFolderForUser, listWorkbooks } from "@/lib/access";
import { formatBytes, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export default async function FolderPage({ params }: PageProps<"/folders/[folderId]">) {
  const { folderId } = await params;
  const user = await requireUser();
  const access = getFolderForUser(user, folderId);

  // A folder the user has no grant for is indistinguishable from one that
  // does not exist — no information leaks through this page.
  if (!access) notFound();

  const workbooks = listWorkbooks(folderId);
  const canEdit = access.permission === "edit";

  return (
    <div>
      <Link href="/folders" className="subtle mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <span aria-hidden>←</span> All folders
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{access.folder.name}</h1>
            <span
              className={`badge ${canEdit ? "bg-accent-soft text-accent" : "bg-canvas text-muted"}`}
            >
              {canEdit ? "Can edit" : "View only"}
            </span>
          </div>
          {access.folder.description && <p className="subtle mt-1">{access.folder.description}</p>}
        </div>
        {canEdit && <UploadWorkbookForm folderId={folderId} />}
      </div>

      {canEdit && (
        <div className="card mb-6 p-4">
          <NewWorkbookForm folderId={folderId} />
        </div>
      )}

      {workbooks.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium text-ink">This folder is empty</p>
          <p className="subtle mt-1">
            {canEdit ? "Create a workbook or upload an .xlsx file to get started." : "Nothing has been added yet."}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Last updated</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">By</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Size</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {workbooks.map((workbook) => (
                <tr key={workbook.id} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="px-5 py-3">
                    <Link
                      href={`/workbooks/${workbook.id}`}
                      className="flex items-center gap-2.5 font-medium text-ink hover:text-accent"
                    >
                      <SheetIcon />
                      {workbook.name}
                    </Link>
                  </td>
                  <td className="hidden px-5 py-3 text-muted sm:table-cell">
                    {formatDate(workbook.updatedAt)}
                  </td>
                  <td className="hidden px-5 py-3 text-muted md:table-cell">
                    {workbook.updatedByName ?? "—"}
                  </td>
                  <td className="hidden px-5 py-3 text-muted sm:table-cell">
                    {formatBytes(workbook.sizeBytes)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link className="btn btn-ghost" href={`/api/workbooks/${workbook.id}/download`}>
                        Download
                      </Link>
                      {canEdit && <DeleteWorkbookButton workbookId={workbook.id} name={workbook.name} />}
                    </div>
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

function SheetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="text-emerald-600"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M3.5 9.5h17M9.5 9.5v11" />
    </svg>
  );
}
