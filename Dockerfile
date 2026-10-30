
# ── Build stage ────────────────────────────────────────────────────────────
# Compiles the Next.js app and installs dependencies (including better-sqlite3's
# native binding). The runtime stage below reuses this stage's node_modules, so
# both stages share the same base image and glibc — the compiled .node file is
# guaranteed to match.
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Build tools in case better-sqlite3 has no prebuilt binary for the platform and
# has to compile from source. Not carried into the runtime image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first so this layer caches unless the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# Build the app.
COPY . .
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# tini gives us correct signal handling (Ctrl+C / container stop) as PID 1.
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Bring the built app across. node_modules is copied whole (rather than pruned)
# because the migrate/import scripts run through tsx at container start, so the
# dev dependency tsx has to be present at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/lib ./lib
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/library ./library
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# The SQLite database and uploaded files live here. Mount a volume at this path
# (Railway Volume, Azure Files, a managed disk, or a docker volume) so data
# survives redeploys. No Docker VOLUME instruction — Railway rejects it and
# manages the mount itself; a bind/named volume at /data works the same way.
#
# The container runs as root so it can write a volume the platform mounts as
# root (Railway mounts /data root-owned, which a non-root user cannot create
# files in). The entrypoint fixes ownership and could drop privileges, but for
# this internal, single-tenant app running as root inside the container is fine.
ENV DATA_DIR=/data
RUN mkdir -p /data

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
