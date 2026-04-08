#!/usr/bin/env bash
# =============================================================================
# ViraWorkx GCP Deploy Script
# Builds Docker images, pushes to Artifact Registry, and deploys to Cloud Run.
# Usage: ./infrastructure/gcp/deploy.sh [--skip-build] [--api-only] [--web-only]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.gcp"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Run setup.sh first."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in .env.gcp}"
: "${GCP_REGION:?Set GCP_REGION in .env.gcp}"

# Parse flags
SKIP_BUILD=false
DEPLOY_API=true
DEPLOY_WEB=true

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --api-only)   DEPLOY_WEB=false ;;
    --web-only)   DEPLOY_API=false ;;
  esac
done

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ARTIFACT_REPO="viraworkx"
SQL_INSTANCE="viraworkx-db"
API_SERVICE="viraworkx-api"
WEB_SERVICE="viraworkx-web"
SA_EMAIL="viraworkx-cloudrun@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

IMAGE_BASE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REPO}"
API_IMAGE="${IMAGE_BASE}/api"
WEB_IMAGE="${IMAGE_BASE}/web"

GIT_SHA=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "latest")
TAG="${GIT_SHA}"

SQL_CONNECTION_NAME=$(gcloud sql instances describe "$SQL_INSTANCE" \
  --project="$GCP_PROJECT_ID" --format='value(connectionName)' 2>/dev/null || echo "")

# Production API URL (used as VITE_API_URL at web build time)
PROD_API_URL="${API_URL:-https://api.viraworkx.ai}"

echo "==> Deploy config"
echo "    Project:  $GCP_PROJECT_ID"
echo "    Region:   $GCP_REGION"
echo "    Tag:      $TAG"
echo "    API URL:  $PROD_API_URL"
echo ""

# ---------------------------------------------------------------------------
# Configure Docker auth for Artifact Registry
# ---------------------------------------------------------------------------
echo "==> Configuring Docker for Artifact Registry..."
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

# ---------------------------------------------------------------------------
# Build & push API
# ---------------------------------------------------------------------------
if [[ "$DEPLOY_API" == "true" ]]; then
  if [[ "$SKIP_BUILD" == "false" ]]; then
    echo "==> Building and pushing API image (linux/amd64)..."
    docker buildx build \
      --platform linux/amd64 \
      -f "$ROOT_DIR/apps/api/Dockerfile" \
      -t "${API_IMAGE}:${TAG}" \
      -t "${API_IMAGE}:latest" \
      --push \
      "$ROOT_DIR"
  fi

  # Write env vars to temp file (avoids gcloud escaping issues with commas/colons)
  ENVVARS_FILE=$(mktemp -t viraworkx-api-env)
  cat > "$ENVVARS_FILE" <<ENVEOF
NODE_ENV: production
SKIP_REDIS: 'true'
CORS_ORIGINS: '${CORS_ORIGINS}'
ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY:-}'
EMAIL_FROM: 'no-reply@viraworkx.ai'
ENVEOF

  echo "==> Deploying API to Cloud Run..."
  gcloud run deploy "$API_SERVICE" \
    --image="${API_IMAGE}:${TAG}" \
    --region="$GCP_REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --min-instances=0 \
    --max-instances=10 \
    --memory=512Mi \
    --cpu=1 \
    --timeout=30 \
    --service-account="$SA_EMAIL" \
    --set-cloudsql-instances="$SQL_CONNECTION_NAME" \
    --set-secrets="DATABASE_URL=viraworkx-db-url:latest,JWT_SECRET=viraworkx-jwt-secret:latest,RESEND_API_KEY=viraworkx-resend-key:latest" \
    --env-vars-file="$ENVVARS_FILE" \
    --quiet
  rm -f "$ENVVARS_FILE"

  API_RUN_URL=$(gcloud run services describe "$API_SERVICE" \
    --region="$GCP_REGION" --format='value(status.url)')
  echo "    API deployed: $API_RUN_URL"
fi

# ---------------------------------------------------------------------------
# Build & push Web
# ---------------------------------------------------------------------------
if [[ "$DEPLOY_WEB" == "true" ]]; then
  # Use custom domain if set, otherwise fall back to Cloud Run URL
  if [[ -z "${API_URL:-}" ]] && [[ -n "${API_RUN_URL:-}" ]]; then
    PROD_API_URL="$API_RUN_URL"
  fi

  if [[ "$SKIP_BUILD" == "false" ]]; then
    echo "==> Building and pushing Web image (linux/amd64, VITE_API_URL=$PROD_API_URL)..."
    docker buildx build \
      --platform linux/amd64 \
      -f "$ROOT_DIR/apps/web/Dockerfile" \
      --build-arg "VITE_API_URL=${PROD_API_URL}" \
      -t "${WEB_IMAGE}:${TAG}" \
      -t "${WEB_IMAGE}:latest" \
      --push \
      "$ROOT_DIR"
  fi

  echo "==> Deploying Web to Cloud Run..."
  gcloud run deploy "$WEB_SERVICE" \
    --image="${WEB_IMAGE}:${TAG}" \
    --region="$GCP_REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --min-instances=0 \
    --max-instances=10 \
    --memory=256Mi \
    --cpu=1 \
    --timeout=10 \
    --set-env-vars="API_URL=${PROD_API_URL},AI_ENGINE_URL=" \
    --quiet

  WEB_RUN_URL=$(gcloud run services describe "$WEB_SERVICE" \
    --region="$GCP_REGION" --format='value(status.url)')
  echo "    Web deployed: $WEB_RUN_URL"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "Deployment complete!  (tag: $TAG)"
[[ -n "${API_RUN_URL:-}" ]] && echo "  API:  $API_RUN_URL"
[[ -n "${WEB_RUN_URL:-}" ]] && echo "  Web:  $WEB_RUN_URL"
echo ""
echo "To run DB migrations:"
echo "  gcloud run jobs execute viraworkx-migrate --region $GCP_REGION"
echo "(or connect via Cloud SQL proxy and run prisma migrate deploy)"
echo "============================================================"
