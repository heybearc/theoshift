#!/bin/bash

# 🛡️ APEX GUARDIAN: Clean Staging Deployment Script
# Following CASCADE RULES - Artifact-based deployment only

set -e

echo "🛡️ APEX GUARDIAN: CLEAN STAGING DEPLOYMENT"
echo "Following CASCADE RULES - No direct server modifications"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[GUARDIAN]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# APEX Guardian Rule Validation
print_status "Validating CASCADE RULE compliance..."

# Check we're in project root
if [ ! -f "package.json" ]; then
    print_error "Not in project root. CASCADE RULE: Work from repository only."
    exit 1
fi

# Check we're on staging branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
    print_error "Not on staging branch. Current: $CURRENT_BRANCH"
    print_status "CASCADE RULE: Deploy from correct branch only"
    exit 1
fi

print_success "CASCADE RULE compliance verified"

# Step 1: Create clean deployment artifact (CASCADE RULE)
print_status "Creating clean deployment artifact..."
rm -rf .wmacs-deploy-temp
mkdir -p .wmacs-deploy-temp

# Copy ONLY application files (exclude dev scripts per CASCADE RULES)
print_status "Copying application files (excluding dev scripts)..."
rsync -av \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.next/' \
    --exclude='wmacs-*' \
    --exclude='test-*' \
    --exclude='deploy-*' \
    --exclude='.github/' \
    --exclude='scripts/' \
    --exclude='STAGING_DEPLOYMENT_GUIDE.md' \
    --exclude='SPECS_UPDATE_REQUIRED.md' \
    ./ .wmacs-deploy-temp/

print_success "Clean artifact created (no dev scripts included)"

# Step 2: Create staging environment file (CASCADE RULE)
print_status "Creating staging environment configuration..."
cat > .wmacs-deploy-temp/.env.local << 'EOF'
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=http://10.92.3.24:3001
DATABASE_URL=postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler
NEXTAUTH_SECRET=staging-secret-2024-secure
NEXTAUTH_DEBUG=true
EOF

print_success "Staging environment configuration created"

# Step 3: Deploy to staging server (CASCADE RULE compliant)
print_status "Deploying clean artifact to staging server..."

# Test SSH connection
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes root@10.92.3.24 "echo 'SSH OK'" >/dev/null 2>&1; then
    print_error "Cannot connect to staging server"
    print_status "Please ensure SSH access to root@10.92.3.24"
    exit 1
fi

# Deploy via rsync (artifact-based deployment)
print_status "Syncing clean artifact to staging server..."
rsync -av --delete \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.staging' \
    .wmacs-deploy-temp/ \
    root@10.92.3.24:/opt/jw-attendant-scheduler/

# Step 4: Remote deployment completion (minimal server operations)
print_status "Completing deployment on staging server..."
ssh root@10.92.3.24 << 'REMOTE_SCRIPT'
set -e
cd /opt/jw-attendant-scheduler

echo "🔧 Setting up environment..."
# Ensure .env.staging exists and create symlink
if [ ! -f .env.staging ]; then
    echo "Creating .env.staging..."
    cat > .env.staging << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/jw_attendant_scheduler_staging
NEXTAUTH_URL=https://jw-staging.cloudigan.net
NEXTAUTH_SECRET=staging-secret-2024-secure-fqdn
NEXTAUTH_DEBUG=true
EOF
fi
ln -sf .env.staging .env

echo "🔧 Installing dependencies..."
npm ci --production

echo "🏗️ Building application..."
npm run build

echo "🔄 Restarting application..."
# Kill any existing processes on port 3001
pkill -f "next.*3001" || true
sleep 2

# Start application in background
nohup npm start -- --port 3001 > /var/log/jw-attendant-scheduler.log 2>&1 &

echo "⏳ Waiting for startup..."
sleep 5

echo "✅ Deployment completed"
REMOTE_SCRIPT

# Step 5: Verify deployment (CASCADE RULE)
print_status "Verifying deployment health..."
sleep 3

if curl -f -s http://10.92.3.24:3001 > /dev/null; then
    print_success "✅ Staging deployment successful!"
    echo ""
    echo "🎯 DEPLOYMENT SUMMARY:"
    echo "  • Environment: Staging (10.92.3.24:3001)"
    echo "  • Method: Clean artifact deployment"
    echo "  • CASCADE RULE: Compliant ✅"
    echo "  • Port: 3001 (immutable) ✅"
    echo ""
    echo "🔗 ACCESS URLS:"
    echo "  • Application: http://10.92.3.24:3001"
    echo "  • Admin Panel: http://10.92.3.24:3001/admin"
    echo ""
    echo "📋 NEXT STEPS:"
    echo "  1. Test admin module functionality"
    echo "  2. Run comprehensive testing"
    echo "  3. Validate user acceptance criteria"
else
    print_error "❌ Staging deployment health check failed"
    print_status "Check logs: ssh root@10.92.3.24 'tail -f /var/log/jw-attendant-scheduler.log'"
    exit 1
fi

# Cleanup
rm -rf .wmacs-deploy-temp
print_success "🛡️ APEX GUARDIAN: Clean deployment completed successfully"
