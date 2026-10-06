#!/bin/bash
# fwber-backend-ts Deployment Script for Hetzner

# Exit on error
set -e

echo "🚀 Starting fwber-backend-ts deployment..."

# Configuration (Replace with actual server details or use environment variables)
REMOTE_USER=${REMOTE_USER:-"root"}
REMOTE_HOST=${REMOTE_HOST:-"api.fwber.site"}
REMOTE_PATH=${REMOTE_PATH:-"/var/www/fwber-backend-ts"}

# 1. Build locally
echo "📦 Building project locally..."
npm install
npm run build

# 2. Sync to server
echo "🔄 Syncing files to $REMOTE_HOST..."
# Create directory if it doesn't exist
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_PATH"

# RSYNC files (excluding node_modules and src)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'src' \
  --exclude '.git' \
  --exclude '.env' \
  ./dist/ \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/dist/

rsync -avz \
  package.json \
  package-lock.json \
  prisma/ \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

# 3. Remote installation and restart
echo "⚙️  Configuring remote environment..."
ssh $REMOTE_USER@$REMOTE_HOST << EOF
  cd $REMOTE_PATH
  npm install --production
  npx prisma generate
  npx prisma migrate deploy
  
  # Restart service (assuming pm2 or systemd)
  if command -v pm2 &> /dev/null; then
    pm2 restart fwber-backend || pm2 start dist/index.js --name "fwber-backend"
  else
    echo "⚠️  PM2 not found. Please restart the service manually or configure systemd."
    # systemctl restart fwber-backend
  fi
EOF

echo "✅ Deployment complete!"
