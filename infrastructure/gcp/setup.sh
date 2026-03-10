#!/usr/bin/env bash
# =============================================================================
# ViraWorkx GCP One-Time Setup Script
# Run once to provision all GCP infrastructure before first deploy.
# Usage: ./infrastructure/gcp/setup.sh
# Prerequisites: gcloud CLI authenticated, .env.gcp file created from .env.gcp.example
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Load config
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.gcp"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Copy infrastructure/gcp/.env.gcp.example to infrastructure/gcp/.env.gcp and fill in values."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

# Required vars
: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in .env.gcp}"
: "${GCP_REGION:?Set GCP_REGION in .env.gcp}"
: "${DB_PASSWORD:?Set DB_PASSWORD in .env.gcp}"
: "${JWT_SECRET:?Set JWT_SECRET in .env.gcp}"
: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY in .env.gcp}"

ARTIFACT_REPO="viraworkx"
SQL_INSTANCE="viraworkx-db"
SQL_DB="viraworkx"
SQL_USER="viraworkx"
API_SERVICE="viraworkx-api"
WEB_SERVICE="viraworkx-web"

echo "==> Setting project: $GCP_PROJECT_ID"
gcloud config set project "$GCP_PROJECT_ID"

# ---------------------------------------------------------------------------
# Enable required APIs
# ---------------------------------------------------------------------------
echo "==> Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  --quiet

# ---------------------------------------------------------------------------
# Artifact Registry
# ---------------------------------------------------------------------------
echo "==> Creating Artifact Registry repository..."
gcloud artifacts repositories create "$ARTIFACT_REPO" \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="ViraWorkx Docker images" \
  --quiet 2>/dev/null || echo "    (already exists, skipping)"

# ---------------------------------------------------------------------------
# Cloud SQL — PostgreSQL 15
# ---------------------------------------------------------------------------
echo "==> Creating Cloud SQL instance (this takes ~5 minutes)..."
gcloud sql instances create "$SQL_INSTANCE" \
  --database-version=POSTGRES_15 \
  --region="$GCP_REGION" \
  --tier=db-f1-micro \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --retained-backups-count=7 \
  --availability-type=zonal \
  --quiet 2>/dev/null || echo "    (already exists, skipping)"

echo "==> Creating database and user..."
gcloud sql databases create "$SQL_DB" \
  --instance="$SQL_INSTANCE" --quiet 2>/dev/null || echo "    (db already exists)"

gcloud sql users create "$SQL_USER" \
  --instance="$SQL_INSTANCE" \
  --password="$DB_PASSWORD" \
  --quiet 2>/dev/null || echo "    (user already exists)"

# ---------------------------------------------------------------------------
# Secret Manager — store all sensitive values
# ---------------------------------------------------------------------------
echo "==> Storing secrets in Secret Manager..."

store_secret() {
  local name="$1"
  local value="$2"
  if gcloud secrets describe "$name" --quiet &>/dev/null; then
    echo "    Updating secret: $name"
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --quiet
  else
    echo "    Creating secret: $name"
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic --quiet
  fi
}

# Build DATABASE_URL for Cloud Run (uses Cloud SQL connector socket)
SQL_CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')
DATABASE_URL="postgresql://${SQL_USER}:${DB_PASSWORD}@localhost/${SQL_DB}?host=/cloudsql/${SQL_CONNECTION_NAME}"

store_secret "viraworkx-database-url"     "$DATABASE_URL"
store_secret "viraworkx-jwt-secret"       "$JWT_SECRET"
store_secret "viraworkx-anthropic-key"    "$ANTHROPIC_API_KEY"

# Optional secrets (set to empty if not provided)
store_secret "viraworkx-redis-url"        "${REDIS_URL:-}"
store_secret "viraworkx-stripe-secret"    "${STRIPE_SECRET_KEY:-}"
store_secret "viraworkx-stripe-webhook"   "${STRIPE_WEBHOOK_SECRET:-}"
store_secret "viraworkx-resend-key"       "${RESEND_API_KEY:-}"
store_secret "viraworkx-imocha-key"       "${IMOCHA_API_KEY:-}"
store_secret "viraworkx-cors-origins"     "${CORS_ORIGINS:-https://www.viraworkx.ai}"

# ---------------------------------------------------------------------------
# Service Account for Cloud Run
# ---------------------------------------------------------------------------
SA_NAME="viraworkx-cloudrun"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Creating service account: $SA_EMAIL"
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="ViraWorkx Cloud Run Service Account" \
  --quiet 2>/dev/null || echo "    (already exists)"

echo "==> Granting permissions to service account..."
# Cloud SQL
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client" --quiet

# Secret Manager
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" --quiet

# Grant access to each secret
for secret in viraworkx-database-url viraworkx-jwt-secret viraworkx-anthropic-key \
              viraworkx-redis-url viraworkx-stripe-secret viraworkx-stripe-webhook \
              viraworkx-resend-key viraworkx-imocha-key viraworkx-cors-origins; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" --quiet 2>/dev/null || true
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
IMAGE_BASE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPO}"
echo ""
echo "============================================================"
echo "Setup complete!"
echo ""
echo "SQL Connection:  $SQL_CONNECTION_NAME"
echo "Service Account: $SA_EMAIL"
echo "API image:       ${IMAGE_BASE}/api:latest"
echo "Web image:       ${IMAGE_BASE}/web:latest"
echo ""
echo "Next step: run ./infrastructure/gcp/deploy.sh"
echo "============================================================"
