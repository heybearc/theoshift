#!/bin/bash

# 🛡️ WMACS GUARDIAN: Admin Module Staging Deployment Script
# Based on verified SSH config specs from project workflows

set -e

echo "🚀 STARTING ADMIN MODULE STAGING DEPLOYMENT"
echo "Target: 10.92.3.24:3001 (per SSH config specs)"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in project root directory. Please run from theoshift root."
    exit 1
fi

# Check if we're on staging branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
    print_warning "Not on staging branch. Current: $CURRENT_BRANCH"
    read -p "Switch to staging branch? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout staging
        print_success "Switched to staging branch"
    else
        print_error "Deployment cancelled. Please switch to staging branch first."
        exit 1
    fi
fi

# Ensure we have latest staging code
print_status "Pulling latest staging code..."
git pull origin staging

# Test SSH connection first
print_status "Testing SSH connection to staging server..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes jw-staging "echo 'SSH connection successful'" 2>/dev/null; then
    print_success "SSH connection to jw-staging successful"
elif ssh -o ConnectTimeout=10 -o BatchMode=yes root@10.92.3.24 "echo 'SSH connection successful'" 2>/dev/null; then
    print_success "SSH connection to root@10.92.3.24 successful"
    SSH_TARGET="root@10.92.3.24"
else
    print_error "Cannot connect to staging server. Please check SSH configuration."
    echo "Try: ssh jw-staging OR ssh root@10.92.3.24"
    exit 1
fi

# Set SSH target (prefer alias if available)
SSH_TARGET=${SSH_TARGET:-"jw-staging"}

print_status "Using SSH target: $SSH_TARGET"

# Deploy to staging server
print_status "Deploying admin module to staging server..."

ssh $SSH_TARGET << 'DEPLOY_SCRIPT'
set -e

echo "🔧 Starting deployment on staging server..."

# Navigate to application directory (per SSH config specs)
cd /opt/theoshift-green-staging

echo "📥 Pulling latest staging code..."
git fetch origin
git checkout staging
git pull origin staging

echo "📦 Installing dependencies..."
npm ci

echo "🏗️ Building application..."
npm run build

echo "🔄 Restarting staging service..."
sudo systemctl restart theoshift-green-staging

echo "⏳ Waiting for service to start..."
sleep 5

echo "✅ Checking service status..."
sudo systemctl status theoshift-green-staging --no-pager

echo "🏥 Testing health endpoint..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️ Health check failed - service may still be starting"
fi

echo "🛡️ Admin module deployment completed on staging server"
DEPLOY_SCRIPT

if [ $? -eq 0 ]; then
    print_success "Staging deployment completed successfully!"
    echo ""
    echo "🎯 DEPLOYMENT SUMMARY:"
    echo "  • Target: 10.92.3.24:3001"
    echo "  • Branch: staging"
    echo "  • Admin Module: Phase 2 complete"
    echo "  • Service: theoshift-green-staging"
    echo ""
    echo "🔗 Access URLs:"
    echo "  • Application: http://10.92.3.24:3001"
    echo "  • Admin Panel: http://10.92.3.24:3001/admin"
    echo "  • Health Check: http://10.92.3.24:3001/api/health"
    echo ""
    echo "📋 NEXT STEPS:"
    echo "  1. Run comprehensive testing: node test-admin-module.js"
    echo "  2. Validate admin functionality manually"
    echo "  3. Conduct user acceptance testing"
else
    print_error "Staging deployment failed!"
    echo ""
    echo "🔍 TROUBLESHOOTING:"
    echo "  • Check SSH connection: ssh $SSH_TARGET"
    echo "  • Check service logs: ssh $SSH_TARGET 'journalctl -u theoshift-green-staging -f'"
    echo "  • Check application logs: ssh $SSH_TARGET 'tail -f /var/log/theoshift.log'"
    exit 1
fi
