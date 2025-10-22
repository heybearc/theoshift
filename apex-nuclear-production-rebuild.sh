#!/bin/bash

# APEX Guardian: Nuclear Production Rebuild
# Complete removal and rebuild from staging baseline

set -e

SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

echo "🛡️ APEX GUARDIAN: Nuclear Production Rebuild"
echo "============================================="
echo ""
echo "This will:"
echo "1. REMOVE all production components"
echo "2. COPY exact staging configuration"
echo "3. UPDATE only URLs for production"
echo "4. REBUILD from scratch"
echo ""

# PHASE 1: Nuclear Cleanup
echo "PHASE 1: Nuclear Cleanup of Production"
echo "======================================="

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Stopping all processes...'
pm2 delete jw-attendant || true
pkill -f 'node.*next' || true
pkill -f 'npm.*start' || true

echo 'Removing contaminated components...'
rm -rf node_modules/
rm -rf .next/
rm -rf .env*
rm -f package-lock.json
rm -rf ~/.pm2/

echo 'Production cleaned'
"

# PHASE 2: Copy Staging Baseline
echo ""
echo "PHASE 2: Copy Staging Baseline"
echo "==============================="

# Copy exact files from staging
echo "Copying configuration files from staging..."
scp -F "$SSH_CONFIG" jws:/opt/jw-attendant-scheduler/pages/api/auth/\\[...nextauth\\].ts /tmp/staging-nextauth.ts
scp -F "$SSH_CONFIG" jws:/opt/jw-attendant-scheduler/ecosystem.config.js /tmp/staging-ecosystem.js
scp -F "$SSH_CONFIG" jws:/opt/jw-attendant-scheduler/start.sh /tmp/staging-start.sh
scp -F "$SSH_CONFIG" jws:/opt/jw-attendant-scheduler/.env /tmp/staging-env

# Copy to production
scp -F "$SSH_CONFIG" /tmp/staging-nextauth.ts jwa:/opt/jw-attendant-scheduler/pages/api/auth/\\[...nextauth\\].ts
scp -F "$SSH_CONFIG" /tmp/staging-ecosystem.js jwa:/opt/jw-attendant-scheduler/ecosystem.config.js
scp -F "$SSH_CONFIG" /tmp/staging-start.sh jwa:/opt/jw-attendant-scheduler/start.sh

echo "Staging baseline copied"

# PHASE 3: Update URLs for Production
echo ""
echo "PHASE 3: Update URLs for Production"
echo "===================================="

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Creating production .env from staging template...'
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/jw_attendant_scheduler_staging
NEXTAUTH_URL=https://attendant.cloudigan.net
NEXTAUTH_SECRET=production-nextauth-secret-2024
UPLOAD_DIR=/opt/jw-attendant-scheduler/public/uploads
MAX_FILE_SIZE=10485760
FEEDBACK_ENABLED=true
EOF

echo 'Creating production .env.local...'
cat > .env.local << 'EOF'
NODE_ENV=production
NEXTAUTH_URL=https://attendant.cloudigan.net
NEXTAUTH_SECRET=production-nextauth-secret-2024
DATABASE_URL=postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/jw_attendant_scheduler_staging
EOF

echo 'Making start.sh executable...'
chmod +x start.sh

echo 'Production URLs configured'
"

# PHASE 4: Fresh Install and Build
echo ""
echo "PHASE 4: Fresh Install and Build"
echo "================================="

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Fresh npm install...'
npm install

echo 'Fresh build...'
npm run build

echo 'Build complete'
"

# PHASE 5: Start with Staging Method
echo ""
echo "PHASE 5: Start with Staging Method"
echo "==================================="

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Starting with PM2 using staging method...'
pm2 start ecosystem.config.js
pm2 save

echo 'Application started'
"

# PHASE 6: Validation
echo ""
echo "PHASE 6: Validation"
echo "==================="

sleep 20

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Testing NextAuth providers:'
curl -s http://localhost:3001/api/auth/providers | head -3

echo ''
echo 'Testing from external URL:'
curl -s https://attendant.cloudigan.net/api/auth/providers | head -3

echo ''
echo 'Testing CSS:'
CSS_FILE=\$(find .next -name '*.css' -type f | head -1 | xargs basename)
curl -I http://localhost:3001/_next/static/css/\$CSS_FILE 2>/dev/null | head -1

echo ''
echo 'PM2 Status:'
pm2 list
"

echo ""
echo "🎉 APEX GUARDIAN: Nuclear Rebuild Complete"
echo "==========================================="
echo "Production URL: https://attendant.cloudigan.net"
echo "Admin Login: admin@jwscheduler.local / AdminPass123!"
