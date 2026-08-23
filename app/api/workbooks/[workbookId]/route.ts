import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getWorkbookForUser, touchWorkbook } from "@/lib/access";
import { readWorkbookFile, writeWorkbookFile } from "@/lib/excel";
import { MAX_COLUMNS, MAX_ROWS } from "@/lib/grid";
import { getApiUser } from "@/lib/session";
import { workbookPath } from "@/lib/storage";
import type { SheetData } from "@/lib/types";

const MAX_CELL_LENGTH = 32_767; // Excel's own per-cell limit

export async function GET(request: Request, { params }: RouteContext<"/api/workbooks/[workbookId]">) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { workbookId } = await params;
  const found = getWorkbookForUser(user, workbookId);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await readWorkbookFile(workbookPath(found.workbook.storageName));
  return NextResponse.json({ name: found.workbook.name, permission: found.permission, ...data });
}

export async function PUT(request: Request, { params }: RouteContext<"/api/workbooks/[workbookId]">) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { workbookId } = await params;
  const found = getWorkbookForUser(user, workbookId);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (found.permission !== "edit") {
    return NextResponse.json({ error: "You have view-only access to this folder" }, { status: 403 });
  }

  let sheets: SheetData[];
  try {
    sheets = parseSheets(await request.json());
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  // Write beside the original and swap, so a failed save never truncates the
  // workbook that is already on disk.
  const target = workbookPath(found.workbook.storageName);
  const temporary = `${target}.saving`;
  try {
    await writeWorkbookFile(temporary, { sheets });
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }

  const { size } = await fs.stat(target);
  touchWorkbook(workbookId, size, user.id);

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}

function parseSheets(body: unknown): SheetData[] {
  if (typeof body !== "object" || body === null || !Array.isArray((body as { sheets?: unknown }).sheets)) {
    throw new Error("Expected a { sheets: [...] } payload");
  }

  const sheets = (body as { sheets: unknown[] }).sheets;
  if (sheets.length === 0 || sheets.length > 20) throw new Error("A workbook needs between 1 and 20 sheets");

  return sheets.map((sheet, index) => {
    if (typeof sheet !== "object" || sheet === null) throw new Error(`Sheet ${index + 1} is malformed`);
    const { name, rows } = sheet as { name?: unknown; rows?: unknown };

    if (typeof name !== "string" || name.trim() === "") throw new Error(`Sheet ${index + 1} needs a name`);
    if (!Array.isArray(rows) || rows.length > MAX_ROWS) throw new Error(`Sheet "${name}" has too many rows`);

    const parsedRows = rows.map((row) => {
      if (!Array.isArray(row) || row.length > MAX_COLUMNS) throw new Error(`Sheet "${name}" has too many columns`);
      return row.map((cell) => {
        if (typeof cell !== "string") throw new Error(`Sheet "${name}" contains a non-text cell`);
        return cell.slice(0, MAX_CELL_LENGTH);
      });
    });

    return { name: name.trim().slice(0, 31), rows: parsedRows };
  });
}
