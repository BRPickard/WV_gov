#!/bin/sh
# Container startup: prepare the database, optionally seed the first admin and
# the committed library, then start Next. All three steps are idempotent, so a
# restart or redeploy against an existing /data volume is safe.
set -e

: "${PORT:=3000}"

echo "[entrypoint] applying database schema…"
npm run db:migrate

# Create the first administrator only if BOOTSTRAP_ADMIN_* are set. Fails
# harmlessly (|| true) once the account already exists, so this is safe to leave
# configured across restarts.
if [ -n "$BOOTSTRAP_ADMIN_EMAIL" ] && [ -n "$BOOTSTRAP_ADMIN_PASSWORD" ]; then
  echo "[entrypoint] ensuring administrator ${BOOTSTRAP_ADMIN_EMAIL}…"
  npm run create-admin -- "${BOOTSTRAP_ADMIN_NAME:-Administrator}" "$BOOTSTRAP_ADMIN_EMAIL" "$BOOTSTRAP_ADMIN_PASSWORD" || true
fi

# Load library/ into the database. Skips anything already imported, so it only
# does real work on the first boot against an empty volume.
echo "[entrypoint] importing library…"
npm run import || true

echo "[entrypoint] starting Next on port ${PORT}…"
exec npx next start -H 0.0.0.0 -p "$PORT"
