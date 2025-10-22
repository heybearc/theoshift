#!/bin/bash

# Sync Staging to Production - Complete Environment Match
echo "🔄 Syncing Staging to Production for Perfect Match"
echo "=================================================="

PROD_SERVER="jwa"
STAGING_SERVER="jws"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

echo "1. Comparing package versions..."
echo "Staging packages:"
ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && npm list --depth=0 | grep -E '(tailwind|next|react)'"

echo ""
echo "Production packages:"
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && npm list --depth=0 | grep -E '(tailwind|next|react)'"

echo ""
echo "2. Copying EXACT staging environment to production..."

# Stop production
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "pm2 delete jw-attendant || true"

# Copy package files from staging
echo "Copying package.json and package-lock.json from staging..."
scp -F "$SSH_CONFIG" "$STAGING_SERVER:/opt/jw-attendant-scheduler/package.json" /tmp/staging-package.json
scp -F "$SSH_CONFIG" "$STAGING_SERVER:/opt/jw-attendant-scheduler/package-lock.json" /tmp/staging-package-lock.json

scp -F "$SSH_CONFIG" /tmp/staging-package.json "$PROD_SERVER:/opt/jw-attendant-scheduler/package.json"
scp -F "$SSH_CONFIG" /tmp/staging-package-lock.json "$PROD_SERVER:/opt/jw-attendant-scheduler/package-lock.json"

# Copy exact node_modules from staging
echo "Copying node_modules from staging (this may take a few minutes)..."
ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && tar czf /tmp/node_modules.tar.gz node_modules/"
scp -F "$SSH_CONFIG" "$STAGING_SERVER:/tmp/node_modules.tar.gz" /tmp/
scp -F "$SSH_CONFIG" /tmp/node_modules.tar.gz "$PROD_SERVER:/tmp/"

ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/jw-attendant-scheduler
rm -rf node_modules
tar xzf /tmp/node_modules.tar.gz
rm /tmp/node_modules.tar.gz
"

# Copy exact build from staging
echo "Copying .next build from staging..."
ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && tar czf /tmp/next-build.tar.gz .next/"
scp -F "$SSH_CONFIG" "$STAGING_SERVER:/tmp/next-build.tar.gz" /tmp/
scp -F "$SSH_CONFIG" /tmp/next-build.tar.gz "$PROD_SERVER:/tmp/"

ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/jw-attendant-scheduler
rm -rf .next
tar xzf /tmp/next-build.tar.gz
rm /tmp/next-build.tar.gz
"

echo ""
echo "3. Setting up production environment..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/jw-attendant-scheduler

# Create production .env (same as staging but with prod URLs)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL=\"postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler\"
NEXTAUTH_URL=\"https://attendant.cloudigan.net\"
NEXTAUTH_SECRET=\"prod-secret-$(date +%s)\"
UPLOAD_DIR=\"/opt/jw-attendant-scheduler/public/uploads\"
MAX_FILE_SIZE=10485760
FEEDBACK_ENABLED=true
EOF

echo 'Production environment configured'
"

echo ""
echo "4. Starting production with exact staging setup..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/jw-attendant-scheduler

# Use exact same PM2 setup as staging
pm2 start ecosystem.config.js
pm2 save

echo 'Production started with staging configuration'
"

echo ""
echo "5. Verification..."
sleep 10

echo "Staging CSS files:"
ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && find .next -name '*.css' -type f"

echo ""
echo "Production CSS files:"
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && find .next -name '*.css' -type f"

echo ""
echo "Production CSS test:"
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "curl -I http://localhost:3001/_next/static/css/ 2>/dev/null | head -3"

echo ""
echo "✅ Staging→Production sync complete!"
echo "Production should now exactly match staging environment"
