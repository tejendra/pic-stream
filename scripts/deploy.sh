#!/usr/bin/env bash
# Deploy backend to Cloud Run, build frontend with API URL, deploy to Firebase.
# Run from repo root. Requires gcloud and firebase CLI.
# Create scripts/deploy.env from scripts/deploy.env.example (deploy.env is gitignored).

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f "$REPO_ROOT/scripts/deploy.env" ]; then
  echo "Create scripts/deploy.env from scripts/deploy.env.example and set your secrets."
  exit 1
fi
source "$REPO_ROOT/scripts/deploy.env"

for var in PROJECT_ID JWT_SECRET CORS_ORIGIN GOOGLE_CLOUD_PROJECT FIREBASE_STORAGE_BUCKET VITE_API_URL; do
  if [ -z "${!var}" ]; then
    echo "Set $var in scripts/deploy.env"
    exit 1
  fi
done

IMAGE="us-east1-docker.pkg.dev/${PROJECT_ID}/pic-stream/pic-stream-api"

echo "Building and pushing backend image..."
gcloud builds submit . --config=cloudbuild.yaml

echo "Deploying backend to Cloud Run..."
gcloud run deploy pic-stream-api \
  --image "$IMAGE" \
  --region us-east1 \
  --platform managed \
  --set-env-vars "JWT_SECRET=${JWT_SECRET},CORS_ORIGIN=${CORS_ORIGIN},GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT},FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}" \
  --allow-unauthenticated

echo "Building shared and frontend..."
(cd shared && npm run build)
(cd frontend && VITE_API_URL="$VITE_API_URL" npm run build)

echo "Deploying to Firebase (hosting, rules)..."
firebase deploy

echo "Done."
