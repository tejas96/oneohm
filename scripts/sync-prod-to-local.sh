#!/usr/bin/env bash
set -euo pipefail

# ─── Production (Fly.io) ───
FLY_APP="oneohm-epc-db"
PROD_DB="oneohm_epc"
PROD_USER="oneohm"
PROD_PASSWORD='OneOhm@Secure2025!'
PROXY_PORT=15432

# ─── Local (oneohm-postgres container — matches apps/backend/.env) ───
LOCAL_CONTAINER="oneohm-postgres"
LOCAL_DB="oneohm_epc"
LOCAL_USER="root"
LOCAL_PASSWORD="root"

# pg_dump/psql/pg_isready are NOT required on the host — they run inside
# $LOCAL_CONTAINER via `docker exec`, since that's where they already exist
# (postgres:15-alpine image). The container reaches the fly proxy on the host
# via host.docker.internal.
DUMP_FILE="${TMPDIR:-/tmp}/oneohm_epc_prod_dump.sql"

dexec() { docker exec "$LOCAL_CONTAINER" "$@"; }
dexec_i() { docker exec -i "$LOCAL_CONTAINER" "$@"; }

cleanup() {
  if [[ -n "${PROXY_PID:-}" ]] && kill -0 "$PROXY_PID" 2>/dev/null; then
    echo "Stopping fly proxy (PID $PROXY_PID)..."
    kill "$PROXY_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$PROXY_PID" 2>/dev/null || true
  fi
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

# ─── Preflight checks ───
for cmd in flyctl docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' is required but not found in PATH." >&2
    exit 1
  fi
done

echo "Checking local container '$LOCAL_CONTAINER' is running..."
if ! docker inspect -f '{{.State.Running}}' "$LOCAL_CONTAINER" 2>/dev/null | grep -q true; then
  echo "ERROR: Container '$LOCAL_CONTAINER' is not running."
  exit 1
fi
if ! dexec env PGPASSWORD="$LOCAL_PASSWORD" pg_isready -U "$LOCAL_USER" &>/dev/null; then
  echo "ERROR: Local PostgreSQL inside '$LOCAL_CONTAINER' is not ready."
  exit 1
fi
echo "  Local database is up."

if lsof -iTCP:"$PROXY_PORT" -sTCP:LISTEN &>/dev/null; then
  echo "ERROR: Port $PROXY_PORT is already in use. Kill the process and retry."
  exit 1
fi

# ─── 1. Start Fly proxy ───
echo ""
echo "Starting fly proxy to $FLY_APP on localhost:$PROXY_PORT..."
flyctl proxy "$PROXY_PORT:5432" -a "$FLY_APP" &
PROXY_PID=$!

echo "  Waiting for proxy to be ready..."
READY=false
for _ in $(seq 1 30); do
  if dexec env PGPASSWORD="$PROD_PASSWORD" pg_isready -h host.docker.internal -p "$PROXY_PORT" -U "$PROD_USER" &>/dev/null; then
    READY=true
    break
  fi
  if ! kill -0 "$PROXY_PID" 2>/dev/null; then
    echo "ERROR: fly proxy exited unexpectedly." >&2
    exit 1
  fi
  sleep 1
done

if [[ "$READY" != "true" ]]; then
  echo "ERROR: Proxy did not become ready within 30 seconds." >&2
  exit 1
fi
echo "  Proxy is ready."

# ─── 2. Dump production database (pg_dump runs inside the container, over host.docker.internal) ───
echo ""
echo "Dumping production database '$PROD_DB'..."
dexec env PGPASSWORD="$PROD_PASSWORD" pg_dump \
  -h host.docker.internal \
  -p "$PROXY_PORT" \
  -U "$PROD_USER" \
  -d "$PROD_DB" \
  --no-owner \
  --no-privileges \
  -F p \
  | grep -v 'SET transaction_timeout' \
  > "$DUMP_FILE"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "  Dump complete ($DUMP_SIZE)."

# ─── 3. Stop the proxy (no longer needed) ───
echo "Stopping fly proxy..."
kill "$PROXY_PID" 2>/dev/null || true
for _ in $(seq 1 10); do
  kill -0 "$PROXY_PID" 2>/dev/null || break
  sleep 1
done
kill -9 "$PROXY_PID" 2>/dev/null || true
wait "$PROXY_PID" 2>/dev/null || true
unset PROXY_PID
echo "  Proxy stopped."

# ─── 4. Drop & recreate local database, then restore ───
echo ""
echo "Dropping and recreating local database '$LOCAL_DB'..."

dexec env PGPASSWORD="$LOCAL_PASSWORD" psql \
  -U "$LOCAL_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LOCAL_DB' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

dexec env PGPASSWORD="$LOCAL_PASSWORD" psql \
  -U "$LOCAL_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$LOCAL_DB\";"

dexec env PGPASSWORD="$LOCAL_PASSWORD" psql \
  -U "$LOCAL_USER" -d postgres \
  -c "CREATE DATABASE \"$LOCAL_DB\" OWNER \"$LOCAL_USER\";"

echo "  Database recreated."

# ─── 5. Restore dump into local database (dump piped in over docker exec stdin) ───
echo ""
echo "Restoring dump into local database..."
set +e
dexec_i env PGPASSWORD="$LOCAL_PASSWORD" psql \
  -U "$LOCAL_USER" \
  -d "$LOCAL_DB" \
  --quiet \
  -v ON_ERROR_STOP=0 \
  < "$DUMP_FILE" \
  2>&1 | grep -i 'error' || true
RESTORE_EXIT=${PIPESTATUS[0]}
set -e

if [[ "$RESTORE_EXIT" -ne 0 ]]; then
  echo ""
  echo "WARNING: psql exited with code $RESTORE_EXIT. Some statements may have failed."
  echo "         This is usually fine (e.g. extension not found). Check output above."
fi

# ─── 6. Sync migration tracking tables ───
# Production uses "typeorm_migrations" but local TypeORM defaults to "migrations".
# Copy records so that migration:run knows which migrations are already applied.
echo ""
echo "Syncing migration tracking tables..."
dexec env PGPASSWORD="$LOCAL_PASSWORD" psql \
  -U "$LOCAL_USER" -d "$LOCAL_DB" \
  --quiet -c "
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      timestamp BIGINT NOT NULL,
      name VARCHAR NOT NULL
    );
    INSERT INTO migrations (timestamp, name)
    SELECT timestamp, name FROM typeorm_migrations
    ON CONFLICT DO NOTHING;
  " 2>/dev/null || true
echo "  Migration records synced."

# ─── 7. Verify ───
echo ""
TABLE_COUNT=$(dexec env PGPASSWORD="$LOCAL_PASSWORD" psql \
  -U "$LOCAL_USER" -d "$LOCAL_DB" \
  -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

MIGRATION_COUNT=$(dexec env PGPASSWORD="$LOCAL_PASSWORD" psql \
  -U "$LOCAL_USER" -d "$LOCAL_DB" \
  -t -A -c "SELECT count(*) FROM migrations;" 2>/dev/null || echo "0")

echo "Done! Local database '$LOCAL_DB' now mirrors production."
echo "  Tables restored: $TABLE_COUNT"
echo "  Migrations tracked: $MIGRATION_COUNT"
echo "  Connection: postgresql://$LOCAL_USER:$LOCAL_PASSWORD@localhost:5432/$LOCAL_DB"
