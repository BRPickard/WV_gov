import { notFound } from "next/navigation";
import Explorer, { type ExplorerRow } from "@/components/explorer";
import { getFolderForUser, listFiles, listFoldersForUser } from "@/lib/access";
import { typeLabelOf } from "@/lib/files";
import { requireUser } from "@/lib/session";

export default async function FolderPage({ params }: PageProps<"/folders/[folderId]">) {
  const { folderId } = await params;
  const user = await requireUser();
  const access = getFolderForUser(user, folderId);

  // A folder the user has no grant for is indistinguishable from one that
  // does not exist — no information leaks through this page.
  if (!access) notFound();

  const files = listFiles(folderId);
  const folders = listFoldersForUser(user);

  const rows: ExplorerRow[] = files.map((file) => ({
    id: file.id,
    name: file.name,
    kind: file.kind,
    href: `/files/${file.id}`,
    typeLabel: typeLabelOf(file.name),
    updatedAt: file.updatedAt,
    sizeBytes: file.sizeBytes,
  }));

  return (
    <Explorer
      rows={rows}
      folders={folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        permission: folder.permission,
      }))}
      currentFolderId={folderId}
      currentFolderName={access.folder.name}
      canManage={user.role === "admin"}
      emptyMessage={
        user.role === "admin"
          ? "This folder is empty. Create a workbook or upload a file."
          : "This folder is empty."
      }
    />
  );
}
