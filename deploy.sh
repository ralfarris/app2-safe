#!/usr/bin/env bash
set -e

TARGET_DIR="/home/dso504/app2-safe"
REPO_URL="https://dso504:${GH_PAT}@github.com/ralfarris/app2-safe"
SERVICE_NAME="app2"

echo ">>> Checking and pulling/cloning code on remote..."
mkdir -p "${TARGET_DIR}"
cd "${TARGET_DIR}"

if [ -d .git ]; then
  echo ">>> Repository exists, pulling latest changes..."
  git config remote.origin.url "${REPO_URL}"
  git pull origin main
else
  echo ">>> Cloning repository from scratch..."
  git clone "${REPO_URL}" .
fi

echo ">>> Rebuilding containers..."
docker compose up -d --build

echo ">>> Waiting for database to be ready..."
sleep 5

echo ">>> Running Prisma Migrate Deploy..."
docker compose run --rm -T ${SERVICE_NAME} npx prisma migrate deploy

echo ">>> Cleaning up unused images..."
docker system prune -f

echo "✅ Deployment complete!"
