import Link from "next/link";
import { notFound } from "next/navigation";
import SpreadsheetEditor from "@/components/spreadsheet-editor";
import { getFileForUser, getUserName } from "@/lib/access";
import { readWorkbookFile } from "@/lib/excel";
import { formatBytes, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { storagePath } from "@/lib/storage";

export default async function FilePage({ params }: PageProps<"/files/[fileId]">) {
  const { fileId } = await params;
  const user = await requireUser();
  const found = getFileForUser(user, fileId);

  if (!found) notFound();

  const { file, folder, permission } = found;
  const updatedBy = getUserName(file.updatedBy);

  // Only spreadsheets open in the grid — everything else is offered as a
  // download, which is the only form in which it round-trips intact.
  if (file.kind !== "spreadsheet") {
    return (
      <div>
        <Link href={`/folders/${folder.id}`} className="subtle mb-6 inline-flex items-center gap-1.5 hover:text-ink">
          <span aria-hidden>←</span> {folder.name}
        </Link>

        <h1 className="page-title">{file.name}</h1>
        <p className="subtle mt-1">
          {formatBytes(file.sizeBytes)} · added {formatDate(file.createdAt)}
          {updatedBy && ` by ${updatedBy}`}
        </p>

        <div className="card mt-6 p-10 text-center">
          <p className="font-medium text-ink">This file opens outside the browser</p>
          <p className="subtle mx-auto mt-1 max-w-md">
            Only Excel workbooks (.xlsx) can be edited here. Download this one to open it in the
            application it belongs to.
          </p>
          <Link className="btn btn-primary mt-5" href={`/api/files/${file.id}/download`}>
            Download
          </Link>
        </div>
      </div>
    );
  }

  const { sheets } = await readWorkbookFile(storagePath(file.storageName));

  return (
    <SpreadsheetEditor
      fileId={file.id}
      fileName={file.name}
      folderId={folder.id}
      folderName={folder.name}
      canEdit={permission === "edit"}
      initialSheets={sheets}
      updatedAt={file.updatedAt}
      updatedBy={updatedBy}
    />
  );
}
