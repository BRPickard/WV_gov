"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MAX_COLUMNS, MAX_ROWS, ROW_HEIGHT, columnLabel } from "@/lib/grid";
import type { SheetData } from "@/lib/types";

type Props = {
  fileId: string;
  fileName: string;
  folderId: string;
  folderName: string;
  canEdit: boolean;
  initialSheets: SheetData[];
  updatedAt: string;
  updatedBy: string | null;
};

/** Extra rows rendered above and below the viewport so scrolling stays smooth. */
const OVERSCAN = 10;

/** Column widths, in px. Drag a header's right edge to resize; double-click resets. */
const DEFAULT_COL_WIDTH = 144;
const MIN_COL_WIDTH = 48;
const ROW_HEADER_WIDTH = 56;

export default function SpreadsheetEditor({
  fileId,
  fileName,
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

  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(600);

  // Column widths are a per-viewer convenience, remembered in the browser and
  // never written back to the workbook. Keyed by file so each has its own.
  const widthStorageKey = `wv-colwidths:${fileId}`;
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(widthStorageKey);
      if (saved) setColWidths(JSON.parse(saved));
    } catch {
      // private mode or blocked storage — fall back to default widths
    }
    setRestored(true);
  }, [widthStorageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(widthStorageKey, JSON.stringify(colWidths));
    } catch {
      // ignore storage failures; widths just won't persist
    }
  }, [colWidths, restored, widthStorageKey]);

  const widthOf = useCallback(
    (columnIndex: number) => colWidths[columnIndex] ?? DEFAULT_COL_WIDTH,
    [colWidths],
  );

  /** Drag the right edge of a header to resize its column. */
  function startResize(columnIndex: number, event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widthOf(columnIndex);

    function onMove(moveEvent: PointerEvent) {
      const next = Math.max(MIN_COL_WIDTH, startWidth + (moveEvent.clientX - startX));
      setColWidths((current) => ({ ...current, [columnIndex]: next }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resetWidth(columnIndex: number) {
    setColWidths((current) => {
      const next = { ...current };
      delete next[columnIndex];
      return next;
    });
  }

  // "Lock header" freezes row 1 so it stays visible while scrolling. Like the
  // column widths, it is a per-viewer preference remembered in the browser.
  const freezeStorageKey = `wv-freeze:${fileId}`;
  const [freezeHeader, setFreezeHeader] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(freezeStorageKey);
      if (saved !== null) setFreezeHeader(saved === "1");
    } catch {
      // storage blocked — keep the default
    }
  }, [freezeStorageKey]);

  function toggleFreeze(next: boolean) {
    setFreezeHeader(next);
    try {
      localStorage.setItem(freezeStorageKey, next ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }

  // The frozen row sticks just below the sticky column-letter header, so we
  // measure that header's height to position it.
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [headerHeight, setHeaderHeight] = useState(33);

  const sheet = sheets[active];
  const columnCount = useMemo(
    () => sheet.rows.reduce((widest, row) => Math.max(widest, row.length), 1),
    [sheet],
  );

  /*
   * Only the rows on screen are mounted. A real workbook here runs to 3,500
   * rows x 37 columns — 130,000 inputs, which no browser renders happily —
   * so the rest of the grid is two spacer rows holding the scroll height open.
   */
  const firstVisible = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const lastVisible = Math.min(
    sheet.rows.length,
    firstVisible + Math.ceil(viewport / ROW_HEIGHT) + OVERSCAN * 2,
  );

  // When the header is frozen, row 0 is rendered separately as a sticky row, so
  // the virtual window covers rows 1..n and its top spacer starts after row 0.
  const frozen = freezeHeader && sheet.rows.length > 1;
  const dataStart = frozen ? Math.max(firstVisible, 1) : firstVisible;
  const padTop = frozen ? Math.max(0, dataStart - 1) * ROW_HEIGHT : firstVisible * ROW_HEIGHT;
  const padBottom = (sheet.rows.length - lastVisible) * ROW_HEIGHT;

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const measure = () => {
      setViewport(element.clientHeight);
      if (theadRef.current) setHeaderHeight(theadRef.current.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

  function selectSheet(index: number) {
    setActive(index);
    setScrollTop(0);
    scroller.current?.scrollTo({ top: 0 });
  }

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
    mutate((current) => [
      ...current,
      {
        name: `Sheet${current.length + 1}`,
        rows: Array.from({ length: 12 }, () => Array.from({ length: 6 }, () => "")),
      },
    ]);
    selectSheet(sheets.length);
  }

  function removeSheet(index: number) {
    if (sheets.length <= 1) return;
    if (!confirm(`Delete sheet "${sheets[index].name}"?`)) return;
    mutate((current) => current.filter((_, i) => i !== index));
    setActive((current) => (current >= index && current > 0 ? current - 1 : current));
  }

  /** Enter moves down a row, scrolling it into view first if it is not mounted. */
  function onCellKeyDown(event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, columnIndex: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const target = rowIndex + 1;
    if (target >= sheet.rows.length) return;

    const element = scroller.current;
    if (element) {
      const top = target * ROW_HEIGHT;
      if (top < element.scrollTop) element.scrollTo({ top });
      else if (top + ROW_HEIGHT > element.scrollTop + element.clientHeight) {
        element.scrollTo({ top: top - element.clientHeight + ROW_HEIGHT * 2 });
      }
    }

    requestAnimationFrame(() => {
      const next = document.querySelector<HTMLInputElement>(`[data-cell="${target}:${columnIndex}"]`);
      next?.focus();
      next?.select();
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/files/${fileId}`, {
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

  const visibleRows = sheet.rows.slice(dataStart, lastVisible);

  /** One grid row. `sticky` pins it below the column-letter header (frozen row 1). */
  function renderRow(row: string[], rowIndex: number, sticky = false) {
    return (
      <tr
        key={rowIndex}
        className="group"
        style={
          sticky
            ? { height: ROW_HEIGHT, position: "sticky", top: headerHeight, zIndex: 8 }
            : { height: ROW_HEIGHT }
        }
      >
        <th
          className="sticky left-0 z-10 border-b border-r border-line bg-canvas px-2 text-xs font-normal text-muted"
          style={sticky ? { zIndex: 12 } : undefined}
        >
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
          <td key={columnIndex} className="border-b border-r border-line bg-surface p-0">
            <input
              data-cell={`${rowIndex}:${columnIndex}`}
              className={`block h-8 w-full min-w-0 px-2 text-ink outline-none focus:bg-accent-soft/60 focus:ring-1 focus:ring-inset focus:ring-accent ${
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
    );
  }

  return (
    <div>
      <Link href={`/folders/${folderId}`} className="subtle mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <span aria-hidden>←</span> {folderName}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{fileName}</h1>
          <p className="subtle mt-1">
            {canEdit ? "You can edit this workbook." : "You have view-only access."}
            {updatedBy && ` Last saved by ${updatedBy} on ${new Date(updatedAt).toLocaleDateString()}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status && <span className="subtle">{status}</span>}
          {dirty && <span className="badge bg-amber-50 text-amber-700">Unsaved changes</span>}
          <label className="btn cursor-pointer select-none gap-2" title="Keep row 1 visible while scrolling">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
              checked={freezeHeader}
              onChange={(event) => toggleFreeze(event.target.checked)}
            />
            Lock header
          </label>
          <Link className="btn" href={`/api/files/${fileId}/download`}>
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
            <div key={`${item.name}-${index}`} className="flex shrink-0 items-center">
              <button
                onClick={() => selectSheet(index)}
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
            <button className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-canvas" onClick={addSheet}>
              + Sheet
            </button>
          )}
        </div>

        <div
          ref={scroller}
          className="max-h-[65vh] overflow-auto"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          <table className="w-max border-separate border-spacing-0 text-sm">
            <colgroup>
              <col style={{ width: ROW_HEADER_WIDTH }} />
              {Array.from({ length: columnCount }, (_, columnIndex) => (
                <col key={columnIndex} style={{ width: widthOf(columnIndex) }} />
              ))}
            </colgroup>
            <thead ref={theadRef} className="sticky top-0 z-10">
              <tr>
                <th
                  className="sticky left-0 z-20 border-b border-r border-line bg-canvas"
                  style={{ width: ROW_HEADER_WIDTH }}
                />
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <th
                    key={columnIndex}
                    className="group relative border-b border-r border-line bg-canvas px-2 py-1.5 text-xs font-medium text-muted"
                  >
                    <span className="flex items-center justify-between gap-1 pr-1">
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
                    {/* Drag to resize this column; double-click to reset. */}
                    <span
                      onPointerDown={(event) => startResize(columnIndex, event)}
                      onDoubleClick={() => resetWidth(columnIndex)}
                      className="absolute right-0 top-0 z-10 h-full w-1.5 -mr-px cursor-col-resize hover:bg-accent/40"
                      title="Drag to resize · double-click to reset"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frozen && renderRow(sheet.rows[0], 0, true)}

              {padTop > 0 && (
                <tr aria-hidden>
                  <td colSpan={columnCount + 1} style={{ height: padTop }} className="p-0" />
                </tr>
              )}

              {visibleRows.map((row, offset) => renderRow(row, dataStart + offset))}

              {padBottom > 0 && (
                <tr aria-hidden>
                  <td colSpan={columnCount + 1} style={{ height: padBottom }} className="p-0" />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 border-t border-line px-3 py-2">
          {canEdit && (
            <>
              <button className="btn btn-ghost" onClick={addRow}>
                + Row
              </button>
              <button className="btn btn-ghost" onClick={addColumn}>
                + Column
              </button>
            </>
          )}
          <span className="subtle ml-auto text-xs">
            {sheet.rows.length.toLocaleString()} rows × {columnCount} columns
          </span>
        </div>
      </div>

      <p className="subtle mt-4 text-xs">
        Drag a column&rsquo;s right edge to resize it (double-click to reset). &ldquo;Lock header&rdquo; keeps
        row 1 in view while scrolling. Row 1 is saved as the header row; cells that look like numbers are
        stored as numbers and formulas are saved as text.
      </p>
    </div>
  );
}
