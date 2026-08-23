# WV Document Library

A deliberately small, SharePoint-style document library: folders of Excel
workbooks, per-user permissions, and an in-browser spreadsheet editor. No
Microsoft dependency, no features beyond what it takes to share and edit
`.xlsx` files safely.

Built on Next.js (App Router) with [Better Auth](https://better-auth.com) for
authentication, SQLite for metadata, and [ExcelJS](https://github.com/exceljs/exceljs)
for reading and writing real `.xlsx` files.

## What it does

- **Secure sign-in.** Email + password sessions handled by Better Auth
  (scrypt-hashed credentials, HTTP-only session cookies, 8-hour sessions).
  Self-service sign-up is disabled — accounts are issued by an administrator.
- **Folders you can actually see.** Every folder query joins through a grant
  table, so a folder a user has no grant for is invisible to them and returns
  the same 404 as one that does not exist.
- **Two permission levels.** `View only` opens workbooks read-only; `Can edit`
  allows editing, uploading and deleting. Administrators hold edit rights
  everywhere.
- **Real Excel editing.** Open a workbook in a grid, change cells, add or
  remove rows, columns and sheets, and save straight back to the `.xlsx` file
  on disk. Download the file at any time.
- **Admin console.** Create accounts, reset passwords, promote to
  administrator, create folders, and grant or revoke folder access.

## Getting started

```bash
npm install
cp .env.example .env.local          # then set BETTER_AUTH_SECRET
npm run db:migrate                  # create the tables
npm run seed                        # optional demo data (see below)
npm run dev                         # http://localhost:3000
```

`BETTER_AUTH_SECRET` is required — generate one with `openssl rand -base64 32`.
`BETTER_AUTH_URL` must match the origin the app is served from; requests
arriving with a different `Origin` header are rejected.

### Running it in a conda / Anaconda environment

There is no Python in this project — conda is simply a convenient way to pin a
Node runtime per project instead of installing one system-wide. An
`environment.yml` is included:

```bash
conda env create -f environment.yml
conda activate wv-document-library
npm install                         # then follow "Getting started" above
```

Everything after that is identical: `npm run db:migrate`, `npm run seed`,
`npm run dev`.

Two things worth knowing:

- **Use the conda-forge channel, not Anaconda's `defaults`.** The
  `environment.yml` asks for `conda-forge` and `nodefaults`, but if
  `defaults` is still in your own `~/.condarc`, `conda env create` stops with
  a Terms of Service error for `repo.anaconda.com`. Either run the
  `conda tos accept` commands it prints, or drop `defaults` from your
  channels (`conda config --remove channels defaults`). Miniforge, which ships
  with conda-forge only, avoids the question entirely.
- **`better-sqlite3` is a native module.** Its installer downloads a prebuilt
  binary for your platform and Node version, which is why the environment pins
  `nodejs=22.*` — the package supports Node 20 and 22-26, so an older conda
  Node (18, say) will fail to install. If no prebuilt binary exists for your
  platform, npm falls back to compiling with node-gyp; add build tools to the
  environment in that case:

  ```yaml
  dependencies:
    - nodejs=22.*
    - python          # node-gyp needs it
    - make
    - cxx-compiler    # on Windows, install MSVC Build Tools instead
  ```

### Demo accounts

`npm run seed` creates three accounts (password `ChangeMe!2026`, override with
`SEED_PASSWORD`) and three folders that demonstrate the permission model:

| Account | Role | Budget FY26 | Public Works | Human Resources |
| --- | --- | --- | --- | --- |
| `admin@wv.gov` | Administrator | edit | edit | edit |
| `dana@wv.gov` | Member | edit | — | — |
| `marcus@wv.gov` | Member | view | edit | — |

Dana never sees Public Works or Human Resources; Marcus can read the budget
workbook but the API rejects any save he attempts.

### Bootstrapping a real deployment

Sign-up is closed, so the first administrator has to come from the seed script.
Either run `npm run seed` and change that account's password and email from the
admin console, or write a one-off script that calls `createUserAccount` from
`lib/users.ts` with `role: "admin"`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Migrate, then start the dev server |
| `npm run build` | Production build |
| `npm run start` | Migrate, then start the production server |
| `npm run db:migrate` | Create/update all tables (idempotent) |
| `npm run seed` | Create the demo accounts, folders and workbooks |

## How it fits together

```
app/
  login/                     sign-in page
  (app)/                     everything behind a session
    folders/                 folder list + folder contents + server actions
    workbooks/[workbookId]/  the spreadsheet editor page
    admin/                   user, folder and access management
  api/
    auth/[...all]/           Better Auth handler
    workbooks/[workbookId]/  GET sheet data, PUT save, GET download
lib/
  auth.ts        Better Auth configuration
  db.ts          SQLite connection + app schema
  schema.ts      the app's tables as SQL
  access.ts      every permission-scoped query lives here
  session.ts     session helpers for pages and route handlers
  users.ts       admin-only account provisioning
  excel.ts       .xlsx <-> grid conversion (server only)
  grid.ts        grid constants shared with client components
  storage.ts     file paths, upload limits
proxy.ts         optimistic redirect for anonymous visitors
```

**Where authorisation happens.** `proxy.ts` only checks for the presence of a
session cookie so anonymous visitors do not see a protected shell flash. The
real checks are server-side: every page calls `requireUser()`/`requireAdmin()`,
and every read goes through `lib/access.ts`, which either joins `folder_access`
or short-circuits for administrators. Route handlers re-check the same grants
before reading or writing a file, so a hand-crafted request cannot reach a
workbook the caller has not been granted.

**Storage.** Metadata lives in `data/app.db` (SQLite); the workbooks themselves
are stored as real `.xlsx` files under `data/files/`, named by UUID so an
uploaded filename can never escape the directory. Saves are written to a
temporary file and renamed into place, so a failed save cannot truncate the
existing workbook. Set `DATA_DIR` to move both.

## Known limits

These are deliberate, to keep the app small:

- Cell **formulas are saved as text**, not recalculated. Formatting, charts,
  merged cells and images in an uploaded workbook are not preserved on save.
- Saving writes the whole workbook. Two people editing the same file at the
  same time will have the last save win — there is no cell-level merge.
- Uploads are capped at 10 MB, 5,000 rows and 200 columns per sheet.
- SQLite and local disk mean a single server. Point `DATA_DIR` at a persistent
  volume, and back it up.
