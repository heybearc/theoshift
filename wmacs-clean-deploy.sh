#!/bin/bash

# WMACS Guardian: Clean CI/CD Deployment Script
# Ensures zero cross-environment contamination

set -e

ENVIRONMENT=$1
COMMIT_SHA=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$COMMIT_SHA" ]; then
    echo "Usage: $0 <staging|production> <commit-sha>"
    exit 1
fi

echo "🛡️ WMACS Guardian: Deploying $COMMIT_SHA to $ENVIRONMENT"

# Environment-specific configuration
case $ENVIRONMENT in
    "staging")
        SERVER="10.92.3.24"
        SERVICE_NAME="theoshift-green-staging"
        DEPLOY_PATH="/opt/theoshift-green-staging"
        NEXTAUTH_URL="http://10.92.3.24:3001"
        DATABASE_URL="postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/theoshift_scheduler_staging"
        NEXTAUTH_SECRET="staging-secret-2024"
        DEBUG="true"
        ;;
    "production")
        SERVER="10.92.3.22"
        SERVICE_NAME="theoshift-green-production"
        DEPLOY_PATH="/opt/theoshift-green-production"
        NEXTAUTH_URL="http://10.92.3.22:3001"
        DATABASE_URL="postgresql://jw_scheduler:jw_password@10.92.3.21:5432/theoshift_scheduler"
        NEXTAUTH_SECRET="production-secret-2024-ultra-secure"
        DEBUG="false"
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "📋 Deploying to: $SERVER"
echo "📋 Service: $SERVICE_NAME"
echo "📋 Path: $DEPLOY_PATH"

# Step 1: Stop service
echo "🛑 Stopping service..."
ssh root@$SERVER "systemctl stop $SERVICE_NAME || true"

# Step 2: Backup current deployment
echo "💾 Creating backup..."
ssh root@$SERVER "cp -r $DEPLOY_PATH ${DEPLOY_PATH}.backup.$(date +%Y%m%d_%H%M%S) || true"

# Step 3: Clean deployment
echo "🧹 Cleaning deployment directory..."
ssh root@$SERVER "rm -rf $DEPLOY_PATH"

# Step 4: Deploy fresh code
echo "📦 Deploying fresh code from commit $COMMIT_SHA..."
ssh root@$SERVER "cd /opt && git clone https://github.com/heybearc/theoshift.git $(basename $DEPLOY_PATH)"
ssh root@$SERVER "cd $DEPLOY_PATH && git checkout $COMMIT_SHA"

# Step 5: Install dependencies
echo "📚 Installing dependencies..."
ssh root@$SERVER "cd $DEPLOY_PATH && npm install"

# Step 6: Create environment-specific configuration
echo "⚙️ Creating $ENVIRONMENT configuration..."
ssh root@$SERVER "cd $DEPLOY_PATH && cat > .env << 'EOF'
DATABASE_URL=$DATABASE_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=$NEXTAUTH_URL
NODE_ENV=production
PORT=3001
NEXTAUTH_DEBUG=$DEBUG
EOF"

# Step 7: Build application
echo "🔨 Building application..."
ssh root@$SERVER "cd $DEPLOY_PATH && npm run build"

# Step 8: Verify no staging references
echo "🔍 Verifying no cross-environment references..."
BLUE_REFS=$(ssh root@$SERVER "cd $DEPLOY_PATH && grep -r '10.92.3.24' . --exclude-dir=node_modules --exclude-dir=.git || true")
if [ ! -z "$BLUE_REFS" ]; then
    echo "❌ BLUE REFERENCES FOUND IN $ENVIRONMENT:"
    echo "$BLUE_REFS"
    exit 1
fi

# Step 9: Create/update systemd service
echo "🔧 Creating systemd service..."
ssh root@$SERVER "cat > /etc/systemd/system/$SERVICE_NAME.service << 'EOF'
[Unit]
Description=Theocratic Shift Scheduler ($ENVIRONMENT)
After=network.target

[Service]
Type=exec
User=root
Group=root
WorkingDirectory=$DEPLOY_PATH
Environment=PATH=/usr/bin:/bin
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"

# Step 10: Start service
echo "🚀 Starting service..."
ssh root@$SERVER "systemctl daemon-reload"
ssh root@$SERVER "systemctl enable $SERVICE_NAME"
ssh root@$SERVER "systemctl start $SERVICE_NAME"

# Step 11: Verify deployment
echo "✅ Verifying deployment..."
sleep 5
STATUS=$(ssh root@$SERVER "systemctl is-active $SERVICE_NAME")
if [ "$STATUS" != "active" ]; then
    echo "❌ Service failed to start"
    ssh root@$SERVER "journalctl -u $SERVICE_NAME -n 20 --no-pager"
    exit 1
fi

# Step 12: Test endpoint
echo "🧪 Testing endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER:3001)
if [ "$RESPONSE" != "200" ] && [ "$RESPONSE" != "307" ]; then
    echo "❌ Endpoint test failed: HTTP $RESPONSE"
    exit 1
fi

echo "🎉 WMACS Guardian: $ENVIRONMENT deployment successful!"
echo "📋 Commit: $COMMIT_SHA"
echo "🌐 URL: http://$SERVER:3001"
echo "🔧 Service: $SERVICE_NAME"
