# WV Document Library

Next.js (App Router) + Better Auth + SQLite + ExcelJS. See README.md for the
full picture; the essentials for working in this repo:

- **Never bypass `lib/access.ts`.** Every folder/workbook read must go through
  it — it is the only place the permission join lives. Pages call
  `requireUser()`/`requireAdmin()` from `lib/session.ts`; route handlers call
  `getApiUser()` and then re-check with `getWorkbookForUser`/`getFolderForUser`.
- `proxy.ts` is an optimistic cookie check only. It is not authorisation.
- `lib/excel.ts` imports ExcelJS and is server-only. Anything a client
  component needs (grid limits, column labels) belongs in `lib/grid.ts`.
- Schema changes: auth tables come from `npm run db:migrate` (generated from
  the Better Auth config), app tables from `lib/schema.ts`, applied on boot.
- `npm run build` runs the TypeScript check; run it before committing.
