import Link from "next/link";
import { listFoldersForUser } from "@/lib/access";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Folders · WV Document Library" };

export default async function FoldersPage() {
  const user = await requireUser();
  const folders = listFoldersForUser(user);

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Folders</h1>
        <p className="subtle mt-1">
          {user.role === "admin"
            ? "Every folder in the library."
            : "The folders an administrator has shared with you."}
        </p>
      </div>

      {folders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium text-ink">Nothing shared with you yet</p>
          <p className="subtle mx-auto mt-1 max-w-sm">
            When an administrator grants you access to a folder, it will appear here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <li key={folder.id}>
              <Link
                href={`/folders/${folder.id}`}
                className="card flex h-full flex-col p-5 transition hover:border-accent/40 hover:shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <FolderIcon />
                  </span>
                  <span
                    className={`badge ${
                      folder.permission === "edit"
                        ? "bg-accent-soft text-accent"
                        : "bg-canvas text-muted"
                    }`}
                  >
                    {folder.permission === "edit" ? "Can edit" : "View only"}
                  </span>
                </div>
                <p className="font-medium text-ink">{folder.name}</p>
                {folder.description && <p className="subtle mt-1 line-clamp-2">{folder.description}</p>}
                <p className="subtle mt-auto pt-4 text-xs">
                  {folder.fileCount} {folder.fileCount === 1 ? "file" : "files"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 7a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.5.7L11.5 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}
