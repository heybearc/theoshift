#!/bin/bash

# 🚀 APEX GUARDIAN DEPLOYMENT WITH HEALTH CHECK
# Safe deployment script with automatic validation
# Usage: ./scripts/deploy-with-health-check.sh [staging|production]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
if [ "$ENVIRONMENT" = "staging" ]; then
    SSH_HOST="10.92.3.24"
    BRANCH="feature/event-details-functionality-audit"
elif [ "$ENVIRONMENT" = "production" ]; then
    SSH_HOST="10.92.3.22"
    BRANCH="main"
else
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

SSH_KEY="~/.ssh/jw_staging"
PROJECT_PATH="/opt/theoshift"

echo "🚀 APEX GUARDIAN DEPLOYMENT"
echo "=========================="
echo "Environment: $ENVIRONMENT"
echo "Target: $SSH_HOST"
echo "Branch: $BRANCH"
echo ""

# Step 1: Git push (if not production)
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "📤 Pushing latest changes to repository..."
    git push origin $BRANCH
    echo "✅ Code pushed successfully"
    echo ""
fi

# Step 2: Deploy to server
echo "🔄 Deploying to $ENVIRONMENT server..."
ssh -i $SSH_KEY root@$SSH_HOST << EOF
    set -e
    cd $PROJECT_PATH
    
    echo "📥 Pulling latest code..."
    rm -rf .next || true
    git pull origin $BRANCH
    
    echo "🏗️  Building application..."
    npm run build
    
    echo "🔄 Restarting server..."
    pkill -f "next-server" || true
    sleep 2
    PORT=3001 npm start > server.log 2>&1 &
    
    echo "⏳ Waiting for server startup..."
    sleep 10
EOF

echo "✅ Deployment completed"
echo ""

# Step 3: Run health check
echo "🛡️ Running post-deployment health check..."
if ./scripts/post-deploy-health-check.sh $ENVIRONMENT; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL"
    echo "✅ All systems operational on $ENVIRONMENT"
    
    # Show deployment summary
    echo ""
    echo "📊 DEPLOYMENT SUMMARY"
    echo "===================="
    echo "Environment: $ENVIRONMENT"
    echo "Server: $SSH_HOST:3001"
    echo "Branch: $BRANCH"
    echo "Status: ✅ HEALTHY"
    echo "Timestamp: $(date)"
    
    exit 0
else
    echo ""
    echo "❌ DEPLOYMENT FAILED"
    echo "Health check failed after deployment"
    echo "Manual intervention required"
    
    # Show server logs for debugging
    echo ""
    echo "📋 Recent server logs:"
    ssh -i $SSH_KEY root@$SSH_HOST "cd $PROJECT_PATH && tail -20 server.log"
    
    exit 1
fi
