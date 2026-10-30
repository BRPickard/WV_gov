# Deploying to Railway

Railway builds this repo straight from its `Dockerfile` and runs the container.
The image serves Next.js on the port Railway assigns (`$PORT`, honored by the
entrypoint) and keeps all state — the SQLite database and the uploaded files —
under `/data`, which must be a Railway **volume** so nothing is lost on redeploy.

## One constraint

The database is a single SQLite file, so this runs as **one instance** — do not
scale to multiple replicas (two writers over one file corrupts it). For this
app (an internal library, light writes) that is the right fit. Railway volumes
are real block storage, so the default WAL journal mode is fine — unlike Azure
Files, you do **not** need `SQLITE_JOURNAL_MODE=DELETE` here.

## Option A — deploy from GitHub (recommended)

1. Push this branch to GitHub (see "Pushing the branch" below).
2. In Railway: **New Project → Deploy from GitHub repo**, pick the repo, and
   choose the branch `claude/excel-file-manager-app-vdjigz` (or merge to `main`
   first and deploy that). Railway detects the `Dockerfile` automatically.
3. Add a **Volume** to the service (Service → **Variables/Settings → Volumes**,
   or the Volume button): set the **mount path to `/data`**.
4. Add the environment variables below.
5. Generate a public domain: Service → **Settings → Networking → Generate
   Domain**. Copy that URL — you need it for `BETTER_AUTH_URL`.
6. Set `BETTER_AUTH_URL` to that exact URL and redeploy.

## Option B — deploy with the Railway CLI

```bash
npm i -g @railway/cli
railway login
railway init                 # create a new project
railway up                   # build & deploy using the Dockerfile
railway volume add --mount-path /data
railway domain               # generates the public URL
```

Then set the variables (next section) and run `railway up` again so
`BETTER_AUTH_URL` is in place.

## Environment variables

Set these on the service (Railway dashboard → **Variables**, or
`railway variables --set 'KEY=value'`):

| Variable | Value | Notes |
| --- | --- | --- |
| `BETTER_AUTH_URL` | `https://<your>.up.railway.app` | **Must exactly match** the public URL Railway gave you, or sign-in fails with `Invalid origin`. Update it if you add a custom domain. |
| `BETTER_AUTH_SECRET` | a 32-byte random string | Signs session cookies. Generate once, keep stable: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Changing it logs everyone out. |
| `BOOTSTRAP_ADMIN_NAME` | `AECOM Admin` | First admin, created on first boot. |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@aecom.com` | |
| `BOOTSTRAP_ADMIN_PASSWORD` | a strong password | At least 10 characters. Rotate/remove after first login. |

You do **not** need to set `PORT` (Railway injects it) or `DATA_DIR` (the image
defaults it to `/data`).

## First boot vs. later deploys

The entrypoint runs three idempotent steps on every start, then launches the
server:

1. `db:migrate` — create/update tables (safe every time).
2. `create-admin` — only if the bootstrap admin doesn't already exist.
3. `import` — load `library/` into the database, skipping anything already there.

So the first deploy against an empty volume seeds the admin and the 19 folders;
later deploys are a no-op on data and just restart the server. Edits made in the
app live on the `/data` volume and survive every redeploy.

## Backups

Everything worth keeping is on the `/data` volume: `app.db` and the `files/`
directory. Use Railway's volume backups, or periodically download a copy.

## Local smoke test before deploying

```bash
npm install
cp .env.example .env.local   # set BETTER_AUTH_SECRET
npm run db:migrate
npm run create-admin -- "AECOM Admin" admin@aecom.com "AecomAdmin2026!"
npm run import
npm run dev                  # http://localhost:3000
```
