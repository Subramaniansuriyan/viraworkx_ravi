#!/usr/bin/env bash
# =============================================================================
# ViraWorkx DB Migration Script
# Runs Prisma migrations against Cloud SQL via Cloud SQL Auth Proxy.
# Usage: ./infrastructure/gcp/migrate.sh
# Prerequisites: cloud-sql-proxy installed, .env.gcp filled
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.gcp"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

: "${GCP_PROJECT_ID:?}"
: "${GCP_REGION:?}"
: "${DB_PASSWORD:?}"

SQL_INSTANCE="viraworkx-db"
SQL_USER="viraworkx"
SQL_DB="viraworkx"
PROXY_PORT=5433

SQL_CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" \
  --project="$GCP_PROJECT_ID" --format='value(connectionName)')

echo "==> Starting Cloud SQL Auth Proxy on port $PROXY_PORT..."
# Download proxy if not present
if ! command -v cloud-sql-proxy &>/dev/null; then
  echo "    Downloading cloud-sql-proxy..."
  curl -sSLo /tmp/cloud-sql-proxy \
    "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.10.1/cloud-sql-proxy.darwin.amd64"
  chmod +x /tmp/cloud-sql-proxy
  PROXY_BIN=/tmp/cloud-sql-proxy
else
  PROXY_BIN=cloud-sql-proxy
fi

# Start proxy in background
$PROXY_BIN --port=$PROXY_PORT "$SQL_CONNECTION_NAME" &
PROXY_PID=$!

# Ensure proxy is killed on exit
trap "kill $PROXY_PID 2>/dev/null || true" EXIT

# Wait for proxy to be ready
sleep 3

export DATABASE_URL="postgresql://${SQL_USER}:${DB_PASSWORD}@127.0.0.1:${PROXY_PORT}/${SQL_DB}"

echo "==> Pushing Prisma schema to database..."
cd "$ROOT_DIR"
npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss

echo "==> Migrations complete!"
