import Explorer, { type ExplorerRow } from "@/components/explorer";
import { listFoldersForUser } from "@/lib/access";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Folders · WV Document Library" };

export default async function FoldersPage() {
  const user = await requireUser();
  const folders = listFoldersForUser(user);

  const rows: ExplorerRow[] = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    kind: "folder",
    href: `/folders/${folder.id}`,
    typeLabel: "File folder",
    updatedAt: folder.createdAt,
    sizeBytes: null,
    permission: folder.permission,
  }));

  return (
    <Explorer
      rows={rows}
      folders={folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        permission: folder.permission,
      }))}
      currentFolderId={null}
      currentFolderName={null}
      canManage={false}
      emptyMessage={
        user.role === "admin"
          ? "No folders yet. Create one under Admin."
          : "No folders have been shared with you yet."
      }
    />
  );
}
