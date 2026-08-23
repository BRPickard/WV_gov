import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getFileForUser } from "@/lib/access";
import { getApiUser } from "@/lib/session";
import { storagePath } from "@/lib/storage";

export async function GET(request: Request, { params }: RouteContext<"/api/files/[fileId]/download">) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { fileId } = await params;
  const found = getFileForUser(user, fileId);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = await fs.readFile(storagePath(found.file.storageName));
  const fallbackName = found.file.name.replace(/[^\w.\- ]+/g, "_");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": found.file.contentType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(
        found.file.name,
      )}`,
      "Cache-Control": "no-store",
    },
  });
}
