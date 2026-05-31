#!/usr/bin/env bash
# ==============================================================================
# sync-local-env-to-prod.sh — Upload local .env variables to Fly.io Secrets
# ==============================================================================
set -euo pipefail

# Fly.io application names from fly.toml configs
BACKEND_APP="oneohm-epc-backend"
WEB_APP="oneohm-epc-web"

# Relative paths to local env configs
BACKEND_ENV="apps/backend/.env"
WEB_ENV="apps/web/.env"

# Preflight checks for Fly CLI
if ! command -v flyctl &>/dev/null; then
  echo "❌ ERROR: 'flyctl' CLI is required but not found in PATH." >&2
  exit 1
fi

echo "========================================================"
echo "🚀 OneOhm Production Environment Secrets Sync Utility"
echo "========================================================"

# --- 1. Sync Backend Secrets ---
if [[ -f "$BACKEND_ENV" ]]; then
  echo ""
  echo "Found backend env file at: $BACKEND_ENV"
  read -p "Sync env values to production app '$BACKEND_APP'? (y/N): " -r confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    echo "Uploading secrets to $BACKEND_APP..."
    # Exclude comments and empty lines, then import to fly secrets
    grep -v '^#' "$BACKEND_ENV" | grep -v '^$' | flyctl secrets import -a "$BACKEND_APP"
    echo "✅ Backend secrets successfully updated."
  else
    echo "⏭️ Skipped backend sync."
  fi
else
  echo "ℹ️ Backend env file not found at $BACKEND_ENV. Skipped."
fi

# --- 2. Sync Web Secrets ---
if [[ -f "$WEB_ENV" ]]; then
  echo ""
  echo "Found web env file at: $WEB_ENV"
  read -p "Sync env values to production app '$WEB_APP'? (y/N): " -r confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    echo "Uploading secrets to $WEB_APP..."
    grep -v '^#' "$WEB_ENV" | grep -v '^$' | flyctl secrets import -a "$WEB_APP"
    echo "✅ Web secrets successfully updated."
  else
    echo "⏭️ Skipped web sync."
  fi
else
  echo "ℹ️ Web env file not found at $WEB_ENV. Skipped."
fi

echo ""
echo "🎉 Sync process completed."
