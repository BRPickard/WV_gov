"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Chevron, DocumentGlyph, FolderGlyph, SpreadsheetGlyph } from "@/components/explorer-icons";
import { NewSpreadsheetForm, UploadFileForm } from "@/components/file-actions";
import { deleteFileAction, type ActionState } from "@/app/(app)/folders/actions";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { Permission } from "@/lib/types";

export type ExplorerRow = {
  id: string;
  name: string;
  kind: "folder" | "spreadsheet" | "document";
  href: string;
  typeLabel: string;
  updatedAt: string | null;
  sizeBytes: number | null;
  permission?: Permission;
};

export type SidebarFolder = { id: string; name: string; permission: Permission };

type SortKey = "name" | "updatedAt" | "typeLabel" | "sizeBytes";
type SortDirection = "asc" | "desc";

type Props = {
  rows: ExplorerRow[];
  folders: SidebarFolder[];
  currentFolderId: string | null;
  currentFolderName: string | null;
  canManage: boolean;
  emptyMessage: string;
};

export default function Explorer({
  rows,
  folders,
  currentFolderId,
  currentFolderName,
  canManage,
  emptyMessage,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [treeOpen, setTreeOpen] = useState(true);
  const [deleteState, runDelete, deleting] = useActionState(deleteFileAction, {} as ActionState);
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    const factor = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      // Explorer always floats folders above files, whatever the sort.
      if ((a.kind === "folder") !== (b.kind === "folder")) return a.kind === "folder" ? -1 : 1;

      if (sortKey === "name" || sortKey === "typeLabel") {
        return factor * a[sortKey].localeCompare(b[sortKey], undefined, { numeric: true });
      }
      if (sortKey === "sizeBytes") return factor * ((a.sizeBytes ?? -1) - (b.sizeBytes ?? -1));
      return factor * ((a.updatedAt ?? "").localeCompare(b.updatedAt ?? ""));
    });
  }, [rows, sortKey, direction]);

  const selectedRow = sorted.find((row) => row.id === selected) ?? null;

  function toggleSort(key: SortKey) {
    if (key === sortKey) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  function open(row: ExplorerRow) {
    router.push(row.href);
  }

  function goUp() {
    if (currentFolderId) router.push("/folders");
  }

  /* Explorer's keyboard model: arrows move the selection, Enter opens it,
     Backspace goes up a level. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "Enter" && selectedRow) {
        event.preventDefault();
        open(selectedRow);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        goUp();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      event.preventDefault();
      const index = sorted.findIndex((row) => row.id === selected);
      const next = event.key === "ArrowDown" ? Math.min(sorted.length - 1, index + 1) : Math.max(0, index - 1);
      const row = sorted[index === -1 ? 0 : next];
      if (row) {
        setSelected(row.id);
        listRef.current
          ?.querySelector(`[data-row="${row.id}"]`)
          ?.scrollIntoView({ block: "nearest" });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="card overflow-hidden">
      {/* address bar */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <button
          className="btn btn-ghost px-2 py-1"
          onClick={goUp}
          disabled={!currentFolderId}
          title="Up one level (Backspace)"
        >
          ↑
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm">
          <button className="shrink-0 text-muted hover:text-ink" onClick={() => router.push("/folders")}>
            Document Library
          </button>
          {currentFolderName && (
            <>
              <span className="shrink-0 text-muted">›</span>
              <span className="truncate font-medium text-ink">{currentFolderName}</span>
            </>
          )}
        </div>
        <span className="hidden shrink-0 text-xs text-muted sm:block">
          {rows.length} item{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* toolbar */}
      {(canManage || selectedRow) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas px-3 py-2">
          {currentFolderId && canManage && (
            <>
              <NewSpreadsheetForm folderId={currentFolderId} />
              <UploadFileForm folderId={currentFolderId} />
              <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            </>
          )}
          {selectedRow && (
            <>
              <button className="btn" onClick={() => open(selectedRow)}>
                Open
              </button>
              {selectedRow.kind !== "folder" && (
                <a className="btn" href={`/api/files/${selectedRow.id}/download`}>
                  Download
                </a>
              )}
              {selectedRow.kind !== "folder" && canManage && (
                <form
                  action={runDelete}
                  onSubmit={(event) => {
                    if (!confirm(`Delete "${selectedRow.name}"? This cannot be undone.`)) {
                      event.preventDefault();
                    } else {
                      setSelected(null);
                    }
                  }}
                >
                  <input type="hidden" name="fileId" value={selectedRow.id} />
                  <button className="btn btn-danger" type="submit" disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex min-h-[28rem]">
        {/* navigation pane */}
        <nav className="hidden w-64 shrink-0 overflow-x-hidden border-r border-line bg-canvas/60 py-2 md:block lg:w-72">
          <button
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink hover:bg-line/40"
            onClick={() => setTreeOpen((open) => !open)}
          >
            <Chevron open={treeOpen} />
            <FolderGlyph />
            Document Library
          </button>

          {treeOpen && (
            <ul className="mt-0.5">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <button
                    onClick={() => router.push(`/folders/${folder.id}`)}
                    className={`flex w-full items-start gap-1.5 py-1.5 pl-8 pr-3 text-left text-sm leading-snug transition ${
                      folder.id === currentFolderId
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-ink hover:bg-line/40"
                    }`}
                    title={folder.name}
                  >
                    <FolderGlyph className="mt-0.5" />
                    {/* These folder names share a long prefix, so wrapping beats
                        truncating: ten identical "WV Commerce Grants Calen…"
                        rows are unusable. */}
                    <span>{folder.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* details list */}
        <div ref={listRef} className="min-w-0 flex-1 overflow-auto" onClick={() => setSelected(null)}>
          {sorted.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted">{emptyMessage}</p>
          ) : (
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-line text-left text-xs text-muted">
                  <Column label="Name" sortKey="name" current={sortKey} direction={direction} onSort={toggleSort} />
                  <Column label="Date modified" sortKey="updatedAt" current={sortKey} direction={direction} onSort={toggleSort} className="hidden w-44 sm:table-cell" />
                  <Column label="Type" sortKey="typeLabel" current={sortKey} direction={direction} onSort={toggleSort} className="hidden w-64 lg:table-cell" />
                  <Column label="Size" sortKey="sizeBytes" current={sortKey} direction={direction} onSort={toggleSort} className="hidden w-24 sm:table-cell" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    data-row={row.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(row.id);
                    }}
                    onDoubleClick={() => open(row)}
                    className={`cursor-default select-none border-b border-line/60 ${
                      row.id === selected ? "bg-accent-soft" : "hover:bg-canvas"
                    }`}
                  >
                    <td className="max-w-0 px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        {row.kind === "folder" ? (
                          <FolderGlyph />
                        ) : row.kind === "spreadsheet" ? (
                          <SpreadsheetGlyph />
                        ) : (
                          <DocumentGlyph />
                        )}
                        <span className="truncate text-ink">{row.name}</span>
                        {row.permission === "view" && (
                          <span className="badge shrink-0 bg-canvas text-muted">View only</span>
                        )}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-1.5 text-muted sm:table-cell">
                      {row.updatedAt ? formatDateTime(row.updatedAt) : "—"}
                    </td>
                    <td className="hidden max-w-0 truncate px-3 py-1.5 text-muted lg:table-cell">{row.typeLabel}</td>
                    <td className="hidden whitespace-nowrap px-3 py-1.5 text-right text-muted sm:table-cell">
                      {row.sizeBytes === null ? "" : formatBytes(row.sizeBytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-canvas px-3 py-1.5 text-xs text-muted">
        <span>
          {deleteState.error ? (
            <span className="text-red-600">{deleteState.error}</span>
          ) : (
            <>
              {rows.length} item{rows.length === 1 ? "" : "s"}
              {selectedRow && ` · ${selectedRow.name} selected`}
            </>
          )}
        </span>
        <span className="hidden sm:block">Double-click to open · Enter opens · Backspace goes up</span>
      </div>
    </div>
  );
}

function Column({
  label,
  sortKey,
  current,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th className={`border-r border-line/60 px-3 py-2 font-medium last:border-r-0 ${className}`}>
      <button className="flex w-full items-center gap-1 hover:text-ink" onClick={() => onSort(sortKey)}>
        {label}
        <span className="text-[10px]">{current === sortKey ? (direction === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}
