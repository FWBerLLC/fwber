#!/usr/bin/env bash
set -euo pipefail

# Deployment script for the TypeScript backend stack on Hetzner.
# Supports deployment of 'main' (Production) or 'staging' branches.
#
# Co-tenancy & data-safety invariants:
# 1. Never run `git clean -fd` or `git stash --include-untracked`: untracked
#    server directories like `fwber-backend-ts/prisma/migrations/` and `uploads/`
#    must remain untouched across deploys.
# 2. Always record a `rollback/pre-deploy-*` git tag before `git reset --hard`.
# 3. Prefix CPU-heavy install/build steps with `nice -n 10` for shared-host fairness.

REPO_ROOT="/var/www/fwber/repo"
BACKEND_DIR="$REPO_ROOT/fwber-backend-ts"
GEO_DIR="$REPO_ROOT/fwber-geo"
SUDO_BIN=""
DEPLOY_BRANCH=${1:-"main"}

# Source rustup so non-login SSH sessions (e.g. GitHub Actions) can build fwber-geo
if [ -f "$HOME/.cargo/env" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.cargo/env"
fi
if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

if [ "$(id -u)" -ne 0 ]; then
  SUDO_BIN="sudo"
fi

echo "🚀 Deploying branch: $DEPLOY_BRANCH"

cd "$REPO_ROOT"
git tag -f "rollback/pre-deploy-$(date +%Y%m%d)-$(git rev-parse --short HEAD)" "$(git rev-parse HEAD)" 2>/dev/null || true
git checkout -- . 2>/dev/null || true
git fetch origin
git checkout "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

cd "$BACKEND_DIR"
# Full install (keeping TypeScript & @types/* intact for `tsc` builds)
nice -n 10 npm install --no-fund --no-audit
nice -n 10 npx prisma generate

# Prisma migrate deploy requires a migration directory. If none exists,
# baseline from the current schema so future deploys use normal migrations.
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations/ 2>/dev/null)" ]; then
  echo "⚠️  No Prisma migrations found — creating baseline migration..."
  mkdir -p prisma/migrations/0000_initial
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0000_initial/migration.sql
  npx prisma migrate resolve --applied 0000_initial
  echo "✅ Baseline migration 0000_initial applied."
fi
npx prisma migrate deploy
nice -n 10 npm run build

# Restart service via PM2
if command -v pm2 &> /dev/null; then
  pm2 restart fwber-backend-ts || pm2 start dist/index.js --name "fwber-backend-ts"
  pm2 save
else
  echo "⚠️ PM2 not found, attempting systemd restart..."
  $SUDO_BIN systemctl restart fwber-backend-ts
fi

# Build and restart geo service if the directory exists (low CPU priority for shared host)
if [ -d "$GEO_DIR" ]; then
  echo "🔨 Building fwber-geo..."
  cd "$GEO_DIR"
  nice -n 10 cargo build --release
  $SUDO_BIN systemctl restart fwber-geo
  cd "$BACKEND_DIR"
fi

$SUDO_BIN systemctl reload nginx

echo "✅ fwber TypeScript backend deployment complete."
