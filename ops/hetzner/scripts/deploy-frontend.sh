#!/usr/bin/env bash
set -euo pipefail

# Zero-downtime Next.js standalone build & atomic swap script for Hetzner (`v2.3.89`).
#
# WHY THIS EXISTS:
# Running `next build` in-place wipes `.next/standalone/fwber-frontend/server.js`
# for ~60-90 seconds until output-file-tracing finishes. Previously, if PM2
# restarted `fwber-frontend` during that build window, Node threw:
#   `Error: Cannot find module '.../.next/standalone/fwber-frontend/server.js'`
#
# HOW IT WORKS:
# 1. Live PM2 `fwber-frontend` serves from `.standalone-live/fwber-frontend/server.js`,
#    completely isolated from `.next/` while `next build` runs at `nice -n 10`.
# 2. Once `next build` + `copy-standalone-assets.mjs` succeed, the fresh standalone
#    bundle is staged in `.standalone-next`, atomically swapped into `.standalone-live`
#    via `mv` (<5ms), and PM2 reloads `fwber-frontend` with zero missing-module gap.

REPO_ROOT="/var/www/fwber/repo"
FRONTEND_DIR="$REPO_ROOT/fwber-frontend"
LIVE_DIR="$FRONTEND_DIR/.standalone-live"
NEXT_STAGE_DIR="$FRONTEND_DIR/.standalone-next"
PREV_DIR="$FRONTEND_DIR/.standalone-prev"

cd "$FRONTEND_DIR"

# Seed `.standalone-live` from existing `.next/standalone` on first migration so
# the running server stays protected throughout the upcoming `next build`.
if [ ! -f "$LIVE_DIR/fwber-frontend/server.js" ] && [ -f "$FRONTEND_DIR/.next/standalone/fwber-frontend/server.js" ]; then
  echo "📦 Seeding initial .standalone-live directory from current .next/standalone..."
  rm -rf "$LIVE_DIR"
  cp -a "$FRONTEND_DIR/.next/standalone" "$LIVE_DIR"
fi

echo "🔨 Building fwber-frontend (nice -n 10) while .standalone-live continues serving..."
nice -n 10 npm install --no-fund --no-audit
nice -n 10 npm run build

if [ ! -f "$FRONTEND_DIR/.next/standalone/fwber-frontend/server.js" ]; then
  echo "❌ Build did not produce .next/standalone/fwber-frontend/server.js — aborting swap!"
  exit 1
fi

echo "⚡ Staging standalone bundle and performing atomic directory swap..."
rm -rf "$NEXT_STAGE_DIR" "$PREV_DIR"
cp -a "$FRONTEND_DIR/.next/standalone" "$NEXT_STAGE_DIR"

# Ensure uploads symlink inside staged public directory points to persistent backend uploads
if [ -d "$REPO_ROOT/fwber-backend-ts/uploads" ] && [ ! -e "$NEXT_STAGE_DIR/fwber-frontend/public/uploads" ]; then
  mkdir -p "$NEXT_STAGE_DIR/fwber-frontend/public"
  ln -s "$REPO_ROOT/fwber-backend-ts/uploads" "$NEXT_STAGE_DIR/fwber-frontend/public/uploads"
fi

if [ -d "$LIVE_DIR" ]; then
  mv "$LIVE_DIR" "$PREV_DIR"
fi
mv "$NEXT_STAGE_DIR" "$LIVE_DIR"
rm -rf "$PREV_DIR"

# Point PM2 `fwber-frontend` to `.standalone-live/fwber-frontend/server.js` if not already pointed there
if command -v pm2 &> /dev/null; then
  CURRENT_SCRIPT="$(pm2 jlist | python3 -c "import sys,json; apps=[a for a in json.load(sys.stdin) if a.get('name')=='fwber-frontend']; print(apps[0]['pm2_env']['pm_exec_path'] if apps else '')" 2>/dev/null || true)"
  TARGET_SCRIPT="$LIVE_DIR/fwber-frontend/server.js"
  if [ "$CURRENT_SCRIPT" = "$TARGET_SCRIPT" ]; then
    PORT=3000 HOSTNAME=127.0.0.1 pm2 restart fwber-frontend --update-env
  else
    echo "🔄 Updating PM2 fwber-frontend exec path -> $TARGET_SCRIPT"
    pm2 delete fwber-frontend 2>/dev/null || true
    PORT=3000 HOSTNAME=127.0.0.1 pm2 start "$TARGET_SCRIPT" --name fwber-frontend --cwd "$LIVE_DIR/fwber-frontend"
  fi
  pm2 save
fi

echo "✅ fwber-frontend atomic standalone deployment complete."
