import { notFound } from "next/navigation";
import SpreadsheetEditor from "@/components/spreadsheet-editor";
import { getUserName, getWorkbookForUser } from "@/lib/access";
import { readWorkbookFile } from "@/lib/excel";
import { requireUser } from "@/lib/session";
import { workbookPath } from "@/lib/storage";

export default async function WorkbookPage({ params }: PageProps<"/workbooks/[workbookId]">) {
  const { workbookId } = await params;
  const user = await requireUser();
  const found = getWorkbookForUser(user, workbookId);

  if (!found) notFound();

  const { sheets } = await readWorkbookFile(workbookPath(found.workbook.storageName));

  return (
    <SpreadsheetEditor
      workbookId={found.workbook.id}
      workbookName={found.workbook.name}
      folderId={found.folder.id}
      folderName={found.folder.name}
      canEdit={found.permission === "edit"}
      initialSheets={sheets}
      updatedAt={found.workbook.updatedAt}
      updatedBy={getUserName(found.workbook.updatedBy)}
    />
  );
}
