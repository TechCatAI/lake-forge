#!/usr/bin/env bash
# scripts/build_frontend.sh
# -----------------------------------------------
# Builds the Next.js UI and copies the static
# export into apps/backend/static/ for FastAPI
# to serve at runtime.
# -----------------------------------------------

set -euo pipefail       # fail fast on any error

# Absolute paths
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
STATIC_OUT_DIR="$FRONTEND_DIR/out"
BACKEND_STATIC_DIR="$ROOT_DIR/apps/backend/static"

rm -rf "$FRONTEND_DIR/.next"

echo "▶️  [lake-forge] Building Next.js app…"
cd "$FRONTEND_DIR"

# Reproducible install based on package-lock.json
npm ci

# Production build and static export
npm run build

echo "▶️  Syncing static files → backend…"
mkdir -p "$BACKEND_STATIC_DIR"
find "$BACKEND_STATIC_DIR" -mindepth 1 -delete
cp -R "$STATIC_OUT_DIR"/. "$BACKEND_STATIC_DIR"/

echo "✅  Frontend build & copy complete."

