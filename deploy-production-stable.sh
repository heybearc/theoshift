#!/bin/bash
# Theocratic Shift Scheduler - Production Deployment Script
# Uses the SAME stable method as staging

set -e

echo "🚀 Starting Theocratic Shift Scheduler Deployment to Production"
echo "Using proven staging deployment method"

# Sync code to production server (same as staging)
echo "📦 Syncing code to production server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env.local' \
  --exclude '.git' \
  -e "ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant" \
  /Users/cory/Documents/Cloudy-Work/applications/theoshift/ \
  jwa:/opt/theoshift/

# Build and restart on server (same as staging but with production env)
echo "🔨 Building application..."
ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant jwa << 'ENDSSH'
cd /opt/theoshift

# Set up production environment
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL="postgresql://jw_scheduler:jw_password@10.92.3.21:5432/theoshift_scheduler"
NEXTAUTH_URL="https://theoshift.com"
NEXTAUTH_SECRET="prod-secret-$(date +%s)"
UPLOAD_DIR="/opt/theoshift/public/uploads"
MAX_FILE_SIZE=10485760
FEEDBACK_ENABLED=true
EOF

# Clean build (same as staging)
rm -rf .next
npm install
npx prisma generate
npm run build

# Make start script executable
chmod +x start.sh

# Use PM2 with ecosystem config (same as staging)
pm2 delete theoshift-green || true
pm2 start ecosystem.config.js
pm2 save
ENDSSH

echo "✅ Deployment complete!"
echo "🌐 Application running at: https://theoshift.com"

# Show status (same as staging)
ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant jwa 'pm2 list'

echo ""
echo "🎯 Production deployment using stable staging method complete!"
