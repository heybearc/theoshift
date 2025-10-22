#!/bin/bash
# JW Attendant Scheduler - Staging Deployment Script
# Guarantees fresh build and proper restart

set -e

echo "🚀 Starting JW Attendant Scheduler Deployment to Staging"

# Sync code to staging server
echo "📦 Syncing code to staging server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env.local' \
  --exclude '.git' \
  -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant \
  /Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/ \
  jws:/opt/jw-attendant-scheduler/

# Build and restart on server
echo "🔨 Building application..."
ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant jws << 'ENDSSH'
cd /opt/jw-attendant-scheduler
rm -rf .next
npm run build
chmod +x start.sh
pm2 delete jw-attendant || true
pm2 start ecosystem.config.js
pm2 save
ENDSSH

echo "✅ Deployment complete!"
echo "🌐 Application running at: https://jw-staging.cloudigan.net"

# Show status
ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant jws 'pm2 list'
