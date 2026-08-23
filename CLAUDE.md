# WV Document Library

Next.js (App Router) + Better Auth + SQLite + ExcelJS. See README.md for the
full picture; the essentials for working in this repo:

- **Never bypass `lib/access.ts`.** Every folder/file read must go through it —
  it is the only place the permission join lives. Pages call
  `requireUser()`/`requireAdmin()` from `lib/session.ts`; route handlers call
  `getApiUser()` and then re-check with `getFileForUser`/`getFolderForUser`.
- `proxy.ts` is an optimistic cookie check only. It is not authorisation.
- `lib/excel.ts` imports ExcelJS and is server-only. Anything a client
  component needs (grid limits, column labels, file kinds) belongs in
  `lib/grid.ts` or `lib/files.ts`.
- **`readWorkbookFile` must keep its `ignoreNodes`.** Real workbooks in this
  library apply data validation to whole columns (`D1:G1048576`); ExcelJS
  expands those cell by cell and never finishes. Skipping the nodes costs
  nothing, because saving rewrites the workbook from the grid anyway.
- **The grid is virtualised** — only rows in view are mounted, keyed off the
  fixed `ROW_HEIGHT` in `lib/grid.ts`. Sheets here run to 3,500+ rows; mounting
  every cell produced a 35 MB page. Keep row height fixed and in sync.
- Uploading, creating and deleting files are administrator-only, enforced in
  the folder server actions with `requireAdmin`; `Can edit` only lets a member
  save cell changes to an existing workbook.
- A folder holds two kinds of file. `kind = 'spreadsheet'` (.xlsx) opens in the
  editor; everything else is stored and downloaded byte-for-byte.
- `library/` holds the real folders and documents, committed with the code.
  `npm run import` loads them into `DATA_DIR`; edits in the app change that
  copy, never the committed original. There is no demo seed — setup creates one
  administrator and imports `library/`.
- Schema changes: auth tables come from `npm run db:migrate` (generated from
  the Better Auth config), app tables from `lib/schema.ts`, applied on boot.
- `npm run build` runs the TypeScript check; run it before committing.
