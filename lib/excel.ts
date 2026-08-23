import ExcelJS from "exceljs";
import { MAX_COLUMNS, MAX_ROWS, MIN_COLUMNS, MIN_ROWS } from "./grid";
import type { SheetData, WorkbookData } from "./types";

/** Everything the grid understands is text; conversion back happens on save. */
function toDisplayString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== undefined && value.result !== null) {
      const result = value.result as unknown;
      return typeof result === "object" ? "" : String(result);
    }
    if ("formula" in value && typeof value.formula === "string") return `=${value.formula}`;
    if ("error" in value) return String(value.error);
    return "";
  }
  return String(value);
}

/** "42" -> 42, "true" -> true, "" -> null, anything else stays a string. */
function fromDisplayString(text: string): ExcelJS.CellValue {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && String(asNumber) === trimmed) return asNumber;
  }
  if (trimmed === "TRUE" || trimmed === "FALSE") return trimmed === "TRUE";
  return text;
}

function padGrid(rows: string[][]): string[][] {
  const width = Math.min(
    MAX_COLUMNS,
    Math.max(MIN_COLUMNS, ...rows.map((row) => row.length), MIN_COLUMNS),
  );
  const height = Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows.length));
  const grid: string[][] = [];
  for (let r = 0; r < height; r++) {
    const source = rows[r] ?? [];
    grid.push(Array.from({ length: width }, (_, c) => source[c] ?? ""));
  }
  return grid;
}

export async function readWorkbookFile(filePath: string): Promise<WorkbookData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheets: SheetData[] = workbook.worksheets.map((worksheet) => {
    const rows: string[][] = [];
    const rowCount = Math.min(worksheet.rowCount, MAX_ROWS);
    for (let r = 1; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      const cells: string[] = [];
      const columnCount = Math.min(Math.max(row.cellCount, worksheet.columnCount), MAX_COLUMNS);
      for (let c = 1; c <= columnCount; c++) {
        cells.push(toDisplayString(row.getCell(c).value));
      }
      rows.push(cells);
    }
    return { name: worksheet.name, rows: padGrid(rows) };
  });

  if (sheets.length === 0) sheets.push({ name: "Sheet1", rows: padGrid([]) });
  return { sheets };
}

export async function writeWorkbookFile(filePath: string, data: WorkbookData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sheets = data.sheets.length > 0 ? data.sheets : [{ name: "Sheet1", rows: [[]] }];
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31) || "Sheet1");
    sheet.rows.slice(0, MAX_ROWS).forEach((row, rowIndex) => {
      row.slice(0, MAX_COLUMNS).forEach((text, columnIndex) => {
        const value = fromDisplayString(text);
        if (value !== null) worksheet.getCell(rowIndex + 1, columnIndex + 1).value = value;
      });
    });

    // Row 1 reads as the header in the UI, so make that true in Excel too.
    const header = worksheet.getRow(1);
    header.font = { bold: true };
    header.commit();

    worksheet.columns.forEach((column) => {
      column.width = Math.max(12, Math.min(40, column.width ?? 12));
    });
  }

  await workbook.xlsx.writeFile(filePath);
}

/** A new, empty workbook with a single sheet and the supplied column headers. */
export async function createWorkbookFile(filePath: string, headers: string[] = []): Promise<void> {
  const rows: string[][] = [headers.length > 0 ? headers : ["Column A", "Column B", "Column C"]];
  await writeWorkbookFile(filePath, { sheets: [{ name: "Sheet1", rows: padGrid(rows) }] });
}
