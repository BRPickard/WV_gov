"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_COLUMNS, MAX_ROWS, columnLabel } from "@/lib/grid";
import type { SheetData } from "@/lib/types";

type Props = {
  workbookId: string;
  workbookName: string;
  folderId: string;
  folderName: string;
  canEdit: boolean;
  initialSheets: SheetData[];
  updatedAt: string;
  updatedBy: string | null;
};

export default function SpreadsheetEditor({
  workbookId,
  workbookName,
  folderId,
  folderName,
  canEdit,
  initialSheets,
  updatedAt,
  updatedBy,
}: Props) {
  const [sheets, setSheets] = useState<SheetData[]>(initialSheets);
  const [active, setActive] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sheet = sheets[active];
  const columnCount = useMemo(
    () => sheet.rows.reduce((widest, row) => Math.max(widest, row.length), 1),
    [sheet],
  );

  // Warn before losing edits to a closed tab or a back navigation.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const mutate = useCallback((next: (current: SheetData[]) => SheetData[]) => {
    setSheets((current) => next(current));
    setDirty(true);
    setStatus(null);
  }, []);

  const updateSheet = useCallback(
    (index: number, next: (sheet: SheetData) => SheetData) =>
      mutate((current) => current.map((item, i) => (i === index ? next(item) : item))),
    [mutate],
  );

  function setCell(rowIndex: number, columnIndex: number, value: string) {
    updateSheet(active, (current) => ({
      ...current,
      rows: current.rows.map((row, r) => {
        if (r !== rowIndex) return row;
        const next = [...row];
        while (next.length <= columnIndex) next.push("");
        next[columnIndex] = value;
        return next;
      }),
    }));
  }

  function addRow() {
    if (sheet.rows.length >= MAX_ROWS) return;
    updateSheet(active, (current) => ({
      ...current,
      rows: [...current.rows, Array.from({ length: columnCount }, () => "")],
    }));
  }

  function removeRow(rowIndex: number) {
    if (sheet.rows.length <= 1) return;
    updateSheet(active, (current) => ({
      ...current,
      rows: current.rows.filter((_, r) => r !== rowIndex),
    }));
  }

  function addColumn() {
    if (columnCount >= MAX_COLUMNS) return;
    updateSheet(active, (current) => ({
      ...current,
      rows: current.rows.map((row) => {
        const next = [...row];
        while (next.length < columnCount) next.push("");
        next.push("");
        return next;
      }),
    }));
  }

  function removeColumn(columnIndex: number) {
    if (columnCount <= 1) return;
    updateSheet(active, (current) => ({
      ...current,
      rows: current.rows.map((row) => row.filter((_, c) => c !== columnIndex)),
    }));
  }

  function addSheet() {
    const name = `Sheet${sheets.length + 1}`;
    mutate((current) => [
      ...current,
      { name, rows: Array.from({ length: 12 }, () => Array.from({ length: 6 }, () => "")) },
    ]);
    setActive(sheets.length);
  }

  function removeSheet(index: number) {
    if (sheets.length <= 1) return;
    if (!confirm(`Delete sheet "${sheets[index].name}"?`)) return;
    mutate((current) => current.filter((_, i) => i !== index));
    setActive((current) => (current >= index && current > 0 ? current - 1 : current));
  }

  /** Enter moves down a row, matching normal spreadsheet behaviour. */
  function onCellKeyDown(event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, columnIndex: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const target = document.querySelector<HTMLInputElement>(
      `[data-cell="${rowIndex + 1}:${columnIndex}"]`,
    );
    target?.focus();
    target?.select();
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/workbooks/${workbookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheets }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "The workbook could not be saved.");
      }
      setDirty(false);
      setStatus(`Saved at ${new Date().toLocaleTimeString()}`);
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link href={`/folders/${folderId}`} className="subtle mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <span aria-hidden>←</span> {folderName}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{workbookName}</h1>
          <p className="subtle mt-1">
            {canEdit ? "You can edit this workbook." : "You have view-only access."}
            {updatedBy && ` Last saved by ${updatedBy} on ${new Date(updatedAt).toLocaleDateString()}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status && <span className="subtle">{status}</span>}
          {dirty && <span className="badge bg-amber-50 text-amber-700">Unsaved changes</span>}
          <Link className="btn" href={`/api/workbooks/${workbookId}/download`}>
            Download
          </Link>
          {canEdit && (
            <button className="btn btn-primary" onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 py-2">
          {sheets.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-center">
              <button
                onClick={() => setActive(index)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  index === active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-canvas"
                }`}
              >
                {item.name}
              </button>
              {canEdit && sheets.length > 1 && index === active && (
                <button
                  className="ml-0.5 rounded px-1.5 text-muted hover:text-red-600"
                  onClick={() => removeSheet(index)}
                  title="Delete sheet"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-canvas" onClick={addSheet}>
              + Sheet
            </button>
          )}
        </div>

        <div className="max-h-[65vh] overflow-auto">
          <table className="border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 w-12 border-b border-r border-line bg-canvas" />
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <th
                    key={columnIndex}
                    className="group min-w-[9rem] border-b border-r border-line bg-canvas px-2 py-1.5 text-xs font-medium text-muted"
                  >
                    <span className="flex items-center justify-between gap-1">
                      {columnLabel(columnIndex)}
                      {canEdit && columnCount > 1 && (
                        <button
                          className="invisible rounded px-1 text-muted hover:text-red-600 group-hover:visible"
                          onClick={() => removeColumn(columnIndex)}
                          title={`Delete column ${columnLabel(columnIndex)}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="group">
                  <th className="sticky left-0 z-10 border-b border-r border-line bg-canvas px-2 py-1 text-xs font-normal text-muted">
                    <span className="flex items-center justify-between gap-1">
                      {rowIndex + 1}
                      {canEdit && sheet.rows.length > 1 && (
                        <button
                          className="invisible rounded px-1 hover:text-red-600 group-hover:visible"
                          onClick={() => removeRow(rowIndex)}
                          title={`Delete row ${rowIndex + 1}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </th>
                  {Array.from({ length: columnCount }, (_, columnIndex) => (
                    <td key={columnIndex} className="border-b border-r border-line p-0">
                      <input
                        data-cell={`${rowIndex}:${columnIndex}`}
                        className={`w-full px-2 py-1.5 text-ink outline-none focus:bg-accent-soft/60 focus:ring-1 focus:ring-inset focus:ring-accent ${
                          rowIndex === 0 ? "bg-canvas font-semibold" : "bg-transparent"
                        }`}
                        value={row[columnIndex] ?? ""}
                        readOnly={!canEdit}
                        onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)}
                        onKeyDown={(event) => onCellKeyDown(event, rowIndex, columnIndex)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 border-t border-line px-3 py-2">
            <button className="btn btn-ghost" onClick={addRow}>
              + Row
            </button>
            <button className="btn btn-ghost" onClick={addColumn}>
              + Column
            </button>
            <span className="subtle ml-auto text-xs">
              {sheet.rows.length} rows × {columnCount} columns
            </span>
          </div>
        )}
      </div>

      <p className="subtle mt-4 text-xs">
        Row 1 is saved as the header row. Cells that look like numbers are stored as numbers; formulas are
        saved as text.
      </p>
    </div>
  );
}
