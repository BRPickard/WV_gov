import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getWorkbookForUser } from "@/lib/access";
import { getApiUser } from "@/lib/session";
import { workbookPath } from "@/lib/storage";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request, { params }: RouteContext<"/api/workbooks/[workbookId]/download">) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { workbookId } = await params;
  const found = getWorkbookForUser(user, workbookId);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await fs.readFile(workbookPath(found.workbook.storageName));
  const fallbackName = found.workbook.name.replace(/[^\w.\- ]+/g, "_");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(
        found.workbook.name,
      )}`,
      "Cache-Control": "no-store",
    },
  });
}
