/**
 * Creates a demo library: one administrator, two members, three folders with
 * sample workbooks, and the grants that make each folder visible to a
 * different set of people. Safe to re-run — existing accounts are left alone.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { listUsers, createFolder, registerFile, setFolderAccess } from "../lib/access";
import { db } from "../lib/db";
import { writeWorkbookFile } from "../lib/excel";
import { storagePath } from "../lib/storage";
import { createUserAccount } from "../lib/users";
import type { Role } from "../lib/types";

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe!2026";

const people: { name: string; email: string; role: Role }[] = [
  { name: "Avery Cole", email: "admin@wv.gov", role: "admin" },
  { name: "Dana Reed", email: "dana@wv.gov", role: "member" },
  { name: "Marcus Hill", email: "marcus@wv.gov", role: "member" },
];

const folders = [
  {
    name: "Budget FY26",
    description: "Quarterly budget workbooks for the fiscal year.",
    workbook: {
      name: "Q1 Budget.xlsx",
      rows: [
        ["Line item", "Department", "Budgeted", "Actual", "Variance"],
        ["Salaries", "Operations", "412000", "398450", "13550"],
        ["Equipment", "Operations", "85000", "91200", "-6200"],
        ["Training", "Human Resources", "24000", "18750", "5250"],
        ["Software licences", "Technology", "63500", "63500", "0"],
      ],
    },
    grants: [
      { email: "dana@wv.gov", permission: "edit" as const },
      { email: "marcus@wv.gov", permission: "view" as const },
    ],
  },
  {
    name: "Public Works",
    description: "Road and bridge inspection logs.",
    workbook: {
      name: "Inspection Log.xlsx",
      rows: [
        ["Asset", "County", "Last inspected", "Condition", "Follow up"],
        ["Bridge 14-A", "Kanawha", "2026-03-11", "Good", "None"],
        ["Route 60 culvert", "Cabell", "2026-04-02", "Fair", "Re-inspect in Q3"],
        ["Bridge 22-C", "Monongalia", "2026-01-27", "Poor", "Engineering review"],
      ],
    },
    grants: [{ email: "marcus@wv.gov", permission: "edit" as const }],
  },
  {
    name: "Human Resources",
    description: "Restricted — administrators only.",
    workbook: {
      name: "Headcount.xlsx",
      rows: [
        ["Division", "Approved", "Filled", "Open"],
        ["Operations", "48", "44", "4"],
        ["Technology", "22", "20", "2"],
        ["Human Resources", "9", "9", "0"],
      ],
    },
    grants: [],
  },
];

async function main() {
  const existing = new Map(listUsers().map((user) => [user.email, user.id]));

  for (const person of people) {
    if (existing.has(person.email)) {
      console.log(`· ${person.email} already exists, skipping`);
      continue;
    }
    const result = await createUserAccount({ ...person, password: DEFAULT_PASSWORD });
    if (result.error) throw new Error(`${person.email}: ${result.error}`);
    existing.set(person.email, result.userId!);
    console.log(`✓ created ${person.role} ${person.email}`);
  }

  const adminId = existing.get("admin@wv.gov")!;

  for (const definition of folders) {
    const already = db.prepare(`SELECT id FROM folder WHERE name = ?`).get(definition.name) as
      | { id: string }
      | undefined;
    if (already) {
      console.log(`· folder "${definition.name}" already exists, skipping`);
      continue;
    }

    const folder = createFolder(definition.name, definition.description, adminId);

    const storageName = `${randomUUID()}.xlsx`;
    await writeWorkbookFile(storagePath(storageName), {
      sheets: [{ name: "Sheet1", rows: definition.workbook.rows }],
    });
    registerFile({
      folderId: folder.id,
      name: definition.workbook.name,
      storageName,
      sizeBytes: fs.statSync(storagePath(storageName)).size,
      userId: adminId,
    });

    for (const grant of definition.grants) {
      setFolderAccess(folder.id, existing.get(grant.email)!, grant.permission);
    }

    console.log(`✓ created folder "${definition.name}" with ${definition.workbook.name}`);
  }

  console.log(`\nSign in with any of these — password: ${DEFAULT_PASSWORD}`);
  for (const person of people) console.log(`  ${person.email}  (${person.role})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
