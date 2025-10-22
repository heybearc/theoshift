#!/bin/bash

# APEX Guardian: Exact Staging Copy to Production
# Copy the EXACT working staging setup, only change URLs

set -e

SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

echo "🛡️ APEX GUARDIAN: Exact Staging Copy to Production"
echo "=================================================="

# PHASE 1: Stop Production
echo "PHASE 1: Stopping Production"
echo "============================="

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler
pm2 delete jw-attendant || true
pkill -f 'node.*next' || true
pkill -f 'npm.*start' || true
rm -rf .next node_modules .env*
echo 'Production cleaned'
"

# PHASE 2: Copy EXACT Staging Files
echo ""
echo "PHASE 2: Copying EXACT Staging Files"
echo "====================================="

# Copy the entire staging directory structure
echo "Copying staging codebase..."
ssh -F "$SSH_CONFIG" jws "cd /opt && tar czf /tmp/staging-backup.tar.gz jw-attendant-scheduler/"
scp -F "$SSH_CONFIG" jws:/tmp/staging-backup.tar.gz /tmp/
scp -F "$SSH_CONFIG" /tmp/staging-backup.tar.gz jwa:/tmp/

ssh -F "$SSH_CONFIG" jwa "
cd /opt
rm -rf jw-attendant-scheduler-old
mv jw-attendant-scheduler jw-attendant-scheduler-old 2>/dev/null || true
tar xzf /tmp/staging-backup.tar.gz
chown -R root:root jw-attendant-scheduler/
echo 'Staging files copied to production'
"

# PHASE 3: Update ONLY URLs for Production
echo ""
echo "PHASE 3: Updating URLs for Production"
echo "====================================="

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Creating production environment from staging template...'

# Create production .env based on staging .env but with production URLs
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://jw_scheduler:jw_password@10.92.3.21:5432/jw_attendant_scheduler
NEXTAUTH_URL=https://attendant.cloudigan.net
NEXTAUTH_SECRET=production-secret-$(date +%s)
UPLOAD_DIR=/opt/jw-attendant-scheduler/public/uploads
MAX_FILE_SIZE=10485760
FEEDBACK_ENABLED=true
EOF

# Create production .env.local
cat > .env.local << 'EOF'
NODE_ENV=production
NEXTAUTH_URL=https://attendant.cloudigan.net
NEXTAUTH_SECRET=production-secret-fixed
DATABASE_URL=postgresql://jw_scheduler:jw_password@10.92.3.21:5432/jw_attendant_scheduler
EOF

echo 'Production environment files created'

# Update any hardcoded staging URLs in the code
find . -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' | grep -v node_modules | xargs grep -l 'jw-staging.cloudigan.net' 2>/dev/null | while read file; do
  echo \"Updating \$file\"
  sed -i 's|jw-staging.cloudigan.net|attendant.cloudigan.net|g' \"\$file\"
done

echo 'Staging URLs updated to production'
"

# PHASE 4: Install and Build with Staging Method
echo ""
echo "PHASE 4: Install and Build with Staging Method"
echo "=============================================="

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Installing dependencies (using staging package-lock.json)...'
npm install

echo 'Building with production environment...'
npm run build

echo 'Build completed'
"

# PHASE 5: Start with Staging PM2 Method
echo ""
echo "PHASE 5: Start with Staging PM2 Method"
echo "======================================"

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Starting with staging PM2 configuration...'
pm2 start ecosystem.config.js
pm2 save

echo 'Application started with staging method'
"

# PHASE 6: Validation
echo ""
echo "PHASE 6: Final Validation"
echo "========================="

sleep 20

ssh -F "$SSH_CONFIG" jwa "
cd /opt/jw-attendant-scheduler

echo 'Testing JavaScript chunks:'
curl -I http://10.92.3.22:3001/_next/static/chunks/pages/_app-622b485285bd3c83.js 2>/dev/null | head -1

echo ''
echo 'Testing NextAuth providers:'
curl -s http://10.92.3.22:3001/api/auth/providers | head -3

echo ''
echo 'SUCCESS CHECK:'
curl -s http://10.92.3.22:3001/api/auth/providers | grep 'attendant.cloudigan.net' && echo '🎉 SUCCESS!' || echo '❌ Still staging URLs'

echo ''
echo 'Testing CSS:'
CSS_FILE=\$(find .next -name '*.css' -type f | head -1 | xargs basename)
curl -I http://10.92.3.22:3001/_next/static/css/\$CSS_FILE 2>/dev/null | head -1

echo ''
echo 'PM2 Status:'
pm2 list
"

echo ""
echo "🎉 APEX GUARDIAN: Exact Staging Copy Complete"
echo "============================================="
echo "Production URL: https://attendant.cloudigan.net"
