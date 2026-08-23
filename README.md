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
- **A file browser, not a dashboard.** Folders and files are presented the way
  Windows Explorer presents them: a folder tree down the left, a sortable
  details list (Name / Date modified / Type / Size) on the right, an address
  bar across the top. Single-click selects, double-click opens, Enter opens the
  selection and Backspace goes up a level.
- **Folders you can actually see.** Every folder query joins through a grant
  table, so a folder a user has no grant for is invisible to them and returns
  the same 404 as one that does not exist.
- **Two permission levels.** `View only` opens workbooks read-only; `Can edit`
  allows editing, uploading and deleting. Administrators hold edit rights
  everywhere.
- **Real Excel editing.** Open a workbook in a grid, change cells, add or
  remove rows, columns and sheets, and save straight back to the `.xlsx` file
  on disk. Download the file at any time. The grid renders only the rows on
  screen, so a 3,500-row sheet opens as fast as a 20-row one.
- **Other files ride along.** A folder can also hold Word documents, PDFs,
  `.xlsm`, `.csv` and the like. Those are stored and downloaded byte-for-byte
  rather than opened in the grid — the only form in which they survive intact.
- **Admin console.** Create accounts, reset passwords, promote to
  administrator, create folders, and grant or revoke folder access.

## Getting started

```bash
npm install
cp .env.example .env.local                                    # copy on Windows cmd
npm run db:migrate                                            # create the tables
npm run create-admin -- "Your Name" you@wv.gov "a-password"   # the only account
npm run import                                                # load library/
npm run dev                                                   # http://localhost:3000
```

That leaves you with one administrator and the 19 folders committed under
`library/`. Sign-up is closed, so `create-admin` is the only way an account
comes into existence; everyone else is added from the admin console.

**On Windows** use `cmd` or PowerShell as normal, with two adjustments: `copy`
instead of `cp`, and double quotes everywhere — `cmd` passes single-quoted text
through with the quotes attached, which would end up inside your password.

`BETTER_AUTH_SECRET` is required. Generate one with a command that works on
every platform:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`BETTER_AUTH_URL` matters in production, where it must match the origin the app
is served from. In development it is inferred from the request, so the app works
on whatever port Next picked and on `localhost` or `127.0.0.1` alike.

### Running it in a conda / Anaconda environment

There is no Python in this project — conda is simply a convenient way to pin a
Node runtime per project instead of installing one system-wide. An
`environment.yml` is included:

```bash
conda env create -f environment.yml
conda activate wv-document-library
npm install                         # then follow "Getting started" above
```

Everything after that is identical: `npm run db:migrate`, `npm run create-admin`,
`npm run import`, `npm run dev`.

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

### The document library

The folders and files live in `library/`, committed alongside the code — one
directory per folder, its documents inside. `npm run import` loads them into
the database:

```bash
npm run import              # add anything not imported yet
npm run import -- --replace # also reset already-imported files to the originals
npm run import -- ./other   # import some other directory instead
```

`library/` is the source corpus, not live storage. Importing copies each file
into `DATA_DIR`, and edits made in the app change that copy — the committed
originals stay as they were, which is what makes `--replace` a way back to a
known state.

Re-running is safe: folders and files that already exist are left alone unless
`--replace` is passed. Every spreadsheet is opened during the import, so a file
the editor cannot read is reported rather than left as a broken page. Anything
skipped — a nested directory, an unsupported type, a file over the 10 MB limit —
is listed at the end.

**Imported folders start with no access grants**, so only administrators can
see them until access is handed out under `/admin`. Nothing in a directory tree
says who should be allowed to read it, so the import will not guess.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Migrate, then start the dev server |
| `npm run build` | Production build |
| `npm run start` | Migrate, then start the production server |
| `npm run db:migrate` | Create/update all tables (idempotent) |
| `npm run create-admin -- "<name>" <email> <password>` | Create an administrator |
| `npm run import [-- <dir>] [--replace]` | Load `library/` (or another tree) into the database |

## How it fits together

```
library/                     the folders and documents, one directory each
app/
  login/                     sign-in page
  (app)/                     everything behind a session
    folders/                 the Explorer view: tree, address bar, details list
    files/[fileId]/          the spreadsheet editor, or a download panel
    admin/                   user, folder and access management
  api/
    auth/[...all]/           Better Auth handler
    files/[fileId]/          GET sheet data, PUT save, GET download
lib/
  auth.ts        Better Auth configuration
  db.ts          SQLite connection + app schema
  schema.ts      the app's tables as SQL
  access.ts      every permission-scoped query lives here
  session.ts     session helpers for pages and route handlers
  users.ts       admin-only account provisioning
  excel.ts       .xlsx <-> grid conversion (server only)
  files.ts       which extensions are allowed, and which open in the grid
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

**Storage.** Metadata lives in `data/app.db` (SQLite); the files themselves are
stored under `data/files/`, named by UUID so an uploaded filename can never
escape the directory. Saves are written to a
temporary file and renamed into place, so a failed save cannot truncate the
existing workbook. Set `DATA_DIR` to move both.

## Known limits

These are deliberate, to keep the app small:

- Cell **formulas are saved as text**, not recalculated. Formatting, charts,
  merged cells, images, data validations and conditional formatting in an
  uploaded workbook are not preserved on save — saving rewrites the workbook
  from the grid. Download the original first if any of that matters.
- Saving writes the whole workbook. Two people editing the same file at the
  same time will have the last save win — there is no cell-level merge.
- Uploads are capped at 10 MB, 5,000 rows and 200 columns per sheet.
- Folders do not nest. The import script reports any nested directory it skips.
- SQLite and local disk mean a single server. Point `DATA_DIR` at a persistent
  volume, and back it up.
