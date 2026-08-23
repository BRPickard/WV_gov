/** File-kind helpers. Safe to import from client components. */

export type FileKind = "spreadsheet" | "document";

/** Only these open in the grid editor — they are what ExcelJS round-trips. */
const SPREADSHEET_EXTENSIONS = [".xlsx"];

/**
 * Everything a folder may hold. Anything outside SPREADSHEET_EXTENSIONS is
 * stored and downloaded as-is: .xlsm keeps its macros, .xls its old binary
 * format, and a Word guide sitting next to a template stays readable — none
 * of which survives a round trip through the grid.
 */
const ALLOWED_EXTENSIONS = [
  ".xlsx",
  ".xlsm",
  ".xls",
  ".csv",
  ".docx",
  ".doc",
  ".pdf",
  ".pptx",
  ".txt",
];

const CONTENT_TYPES: Record<string, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
};

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

export function isAllowedFile(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.includes(extensionOf(fileName));
}

export function kindOf(fileName: string): FileKind {
  return SPREADSHEET_EXTENSIONS.includes(extensionOf(fileName)) ? "spreadsheet" : "document";
}

export function contentTypeOf(fileName: string): string {
  return CONTENT_TYPES[extensionOf(fileName)] ?? "application/octet-stream";
}

/** Explorer-style type descriptions for the details list. */
const TYPE_LABELS: Record<string, string> = {
  ".xlsx": "Microsoft Excel Worksheet",
  ".xlsm": "Excel Macro-Enabled Worksheet",
  ".xls": "Microsoft Excel 97-2003 Worksheet",
  ".csv": "Comma Separated Values File",
  ".docx": "Microsoft Word Document",
  ".doc": "Microsoft Word 97-2003 Document",
  ".pdf": "PDF Document",
  ".pptx": "Microsoft PowerPoint Presentation",
  ".txt": "Text Document",
};

export function typeLabelOf(fileName: string): string {
  const extension = extensionOf(fileName);
  return TYPE_LABELS[extension] ?? `${extension.replace(".", "").toUpperCase() || "Unknown"} File`;
}

export const ALLOWED_EXTENSIONS_LABEL = ALLOWED_EXTENSIONS.join(", ");
export const ALLOWED_ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.join(",");
