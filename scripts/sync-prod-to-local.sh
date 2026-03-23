#!/usr/bin/env bash
set -euo pipefail

# ─── Production (Fly.io) ───
FLY_APP="oneohm-epc-db"
PROD_DB="oneohm_epc"
PROD_USER="oneohm"
PROD_PASSWORD='OneOhm@Secure2025!'
PROXY_PORT=15432

# ─── Local (Docker Compose) ───
LOCAL_HOST="localhost"
LOCAL_PORT=5436
LOCAL_DB="oneohm_epc"
LOCAL_USER="oneohm"
LOCAL_PASSWORD="postgres"

DUMP_FILE="/tmp/oneohm_epc_prod_dump.sql"

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
for cmd in flyctl pg_dump psql pg_isready; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' is required but not found in PATH." >&2
    exit 1
  fi
done

echo "Checking local database is reachable on $LOCAL_HOST:$LOCAL_PORT..."
if ! PGPASSWORD="$LOCAL_PASSWORD" pg_isready -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" &>/dev/null; then
  echo "ERROR: Local PostgreSQL is not reachable at $LOCAL_HOST:$LOCAL_PORT."
  echo "       Start it with:  docker compose up postgres -d"
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
  if pg_isready -h localhost -p "$PROXY_PORT" -U "$PROD_USER" &>/dev/null; then
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

# ─── 2. Dump production database ───
echo ""
echo "Dumping production database '$PROD_DB'..."
PGPASSWORD="$PROD_PASSWORD" pg_dump \
  -h localhost \
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

PGPASSWORD="$LOCAL_PASSWORD" psql \
  -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LOCAL_DB' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

PGPASSWORD="$LOCAL_PASSWORD" psql \
  -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$LOCAL_DB\";"

PGPASSWORD="$LOCAL_PASSWORD" psql \
  -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d postgres \
  -c "CREATE DATABASE \"$LOCAL_DB\" OWNER \"$LOCAL_USER\";"

echo "  Database recreated."

# ─── 5. Restore dump into local database ───
echo ""
echo "Restoring dump into local database..."
set +e
PGPASSWORD="$LOCAL_PASSWORD" psql \
  -h "$LOCAL_HOST" \
  -p "$LOCAL_PORT" \
  -U "$LOCAL_USER" \
  -d "$LOCAL_DB" \
  -f "$DUMP_FILE" \
  --quiet \
  -v ON_ERROR_STOP=0 \
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
PGPASSWORD="$LOCAL_PASSWORD" psql \
  -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" \
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
TABLE_COUNT=$(PGPASSWORD="$LOCAL_PASSWORD" psql \
  -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" \
  -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

MIGRATION_COUNT=$(PGPASSWORD="$LOCAL_PASSWORD" psql \
  -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" \
  -t -A -c "SELECT count(*) FROM migrations;" 2>/dev/null || echo "0")

echo "Done! Local database '$LOCAL_DB' now mirrors production."
echo "  Tables restored: $TABLE_COUNT"
echo "  Migrations tracked: $MIGRATION_COUNT"
echo "  Connection: postgresql://$LOCAL_USER:$LOCAL_PASSWORD@$LOCAL_HOST:$LOCAL_PORT/$LOCAL_DB"
