# Deploying to Azure as a container

The app ships as a single Docker image. It serves Next.js on port 3000 and
keeps all of its state — the SQLite database and the uploaded files — under
`/data`, which must be a mounted volume so nothing is lost when the container
is replaced.

This guide uses **Azure Web App for Containers** (App Service) with an **Azure
Container Registry** for the image and an **Azure Files** share for `/data`.
Azure Container Apps or a single Container Instance work the same way; the
env vars and the volume mount are what matter.

## 0. One constraint to design around

The database is SQLite on a single file. **Run exactly one instance** — do not
enable scale-out/multiple workers. Two instances writing the same file over a
network share will corrupt it. For this app (an internal library, light write
traffic) one instance is the right fit; if you later need horizontal scale,
that means moving to Postgres, not more containers.

Because Azure Files is an SMB share, also set `SQLITE_JOURNAL_MODE=DELETE`
(below) — SQLite's default WAL mode is unreliable over SMB.

## 1. Build and push the image

```bash
# Variables — change these.
RG=wv-doclib
LOCATION=eastus
ACR=wvdoclibacr            # must be globally unique, lowercase
APP=wv-doclib             # web app name -> https://wv-doclib.azurewebsites.net

az group create -n $RG -l $LOCATION
az acr create -n $ACR -g $RG --sku Basic --admin-enabled true

# Build the image in ACR (no local Docker needed) from the repo root.
az acr build -r $ACR -t doclib:latest .
```

## 2. Create the Azure Files share for /data

```bash
STG=wvdoclibstore$RANDOM   # storage account, globally unique, lowercase
az storage account create -n $STG -g $RG -l $LOCATION --sku Standard_LRS
KEY=$(az storage account keys list -n $STG -g $RG --query "[0].value" -o tsv)
az storage share create --account-name $STG --account-key "$KEY" -n data --quota 5
```

## 3. Create the web app on the container

```bash
az appservice plan create -n ${APP}-plan -g $RG --is-linux --sku B1

az webapp create -g $RG -p ${APP}-plan -n $APP \
  --deployment-container-image-name $ACR.azurecr.io/doclib:latest

# Let the web app pull from ACR.
az webapp config container set -g $RG -n $APP \
  --container-image-name $ACR.azurecr.io/doclib:latest \
  --container-registry-url https://$ACR.azurecr.io \
  --container-registry-user $(az acr credential show -n $ACR --query username -o tsv) \
  --container-registry-password $(az acr credential show -n $ACR --query "passwords[0].value" -o tsv)
```

## 4. Mount the share at /data

```bash
az webapp config storage-account add -g $RG -n $APP \
  --custom-id data \
  --storage-type AzureFiles \
  --account-name $STG \
  --share-name data \
  --access-key "$KEY" \
  --mount-path /data
```

## 5. Configure the app settings (environment variables)

```bash
# Generate a stable secret once and keep it. Changing it logs everyone out.
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

az webapp config appsettings set -g $RG -n $APP --settings \
  WEBSITES_PORT=3000 \
  BETTER_AUTH_URL="https://$APP.azurewebsites.net" \
  BETTER_AUTH_SECRET="$SECRET" \
  SQLITE_JOURNAL_MODE=DELETE \
  BOOTSTRAP_ADMIN_NAME="AECOM Admin" \
  BOOTSTRAP_ADMIN_EMAIL="admin@aecom.com" \
  BOOTSTRAP_ADMIN_PASSWORD="change-this-to-something-strong"
```

What each one does:

| Setting | Why |
| --- | --- |
| `WEBSITES_PORT` | Tells App Service the container listens on 3000. |
| `BETTER_AUTH_URL` | Must exactly match the browser URL, or sign-in fails with `Invalid origin`. Use your real hostname/custom domain here. |
| `BETTER_AUTH_SECRET` | Signs session cookies. Set once, keep stable. |
| `SQLITE_JOURNAL_MODE=DELETE` | SQLite over Azure Files (SMB) — see the constraint above. |
| `BOOTSTRAP_ADMIN_*` | Creates the first administrator on first boot. Idempotent; safe to leave set. Remove/rotate the password after first login. |

Then restart so the settings and mount take effect:

```bash
az webapp restart -g $RG -n $APP
```

Open `https://$APP.azurewebsites.net` and sign in with the bootstrap admin.

## First boot vs. later boots

The container's entrypoint runs three idempotent steps every start:

1. `db:migrate` — creates/updates tables (safe every time).
2. `create-admin` — creates the bootstrap admin only if it doesn't exist.
3. `import` — loads `library/` into the database, skipping anything already
   there.

So the first boot against an empty `/data` seeds the admin and the 19 folders;
every later boot is a no-op on data and just starts the server. Edits made in
the app live in `/data` and persist across redeploys — a new image never
overwrites them.

## Redeploying a new version

```bash
az acr build -r $ACR -t doclib:latest .
az webapp restart -g $RG -n $APP
```

The `/data` volume is untouched, so accounts, folder access and edited
workbooks all carry over. To also refresh the committed originals in `library/`
back over the live copies, exec in and run `npm run import -- --replace`.

## Custom domain

If you put a custom domain in front (e.g. `library.wv.gov`), set
`BETTER_AUTH_URL` to that URL and add any additional hostnames to
`TRUSTED_ORIGINS` (comma-separated), then restart.

## Backups

Everything worth keeping is in the Azure Files share: `app.db` and the
`files/` directory. Enable snapshots on the storage account, or copy the share
periodically. That is the whole backup story.

## Local smoke test before deploying

```bash
BETTER_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))") \
  docker compose up --build
# http://localhost:3000  ·  admin@aecom.com / AecomAdmin2026!
```
