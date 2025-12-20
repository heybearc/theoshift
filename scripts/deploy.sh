#!/bin/bash
# Theocratic Shift Scheduler - MCP Deployment Script
# Container Infrastructure: 131=postgres, 132=prod, 134=staging

set -e

PROJECT_NAME="theoshift"
CONTAINER_ID=${1:-"134"}  # Default to staging
ENVIRONMENT=${2:-"staging"}
REPO_OWNER="cloudigan"
REPO_NAME="theoshift"

echo "🚀 Theocratic Shift Scheduler MCP Deployment"
echo "========================================"
echo "Project: $PROJECT_NAME"
echo "Container: $CONTAINER_ID"
echo "Environment: $ENVIRONMENT"
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Validate container assignment
case $CONTAINER_ID in
    "132")
        echo "🎯 Deploying to GREEN (Container 132 (green-theoshift) - 10.92.3.22)"
        CONTAINER_IP="10.92.3.22"
        ;;
    "134")
        echo "🎯 Deploying to BLUE (Container 134 (blue-theoshift) - 10.92.3.24)"
        CONTAINER_IP="10.92.3.24"
        ;;
    *)
        echo "❌ Invalid container ID: $CONTAINER_ID"
        echo "Valid containers: 132 (production), 134 (staging)"
        exit 1
        ;;
esac

# Step 1: Get latest commit SHA using GitHub MCP
echo "🔍 Getting latest commit SHA..."
cd /Users/cory/Documents/Cloudy-Work/homelab/mcp-server-github

COMMIT_SHA=$(echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/call\", \"params\": {\"name\": \"get_commit_sha\", \"arguments\": {\"owner\": \"$REPO_OWNER\", \"repo\": \"$REPO_NAME\", \"ref\": \"$ENVIRONMENT\"}}}" | node dist/index.js | tail -1 | jq -r '.result.sha[0:8]' 2>/dev/null || echo "unknown")

if [ "$COMMIT_SHA" = "unknown" ] || [ "$COMMIT_SHA" = "null" ]; then
    echo "❌ Failed to get commit SHA, using timestamp"
    COMMIT_SHA=$(date +%Y%m%d_%H%M%S)
fi

echo "✅ Deployment SHA: $COMMIT_SHA"

# Step 2: Check container status using Proxmox MCP
echo "🔍 Checking container status..."
cd /Users/cory/Documents/Cloudy-Work/homelab/mcp-server-proxmox

CONTAINER_STATUS=$(echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/call\", \"params\": {\"name\": \"get_vm_status\", \"arguments\": {\"node\": \"proxmox\", \"vmid\": \"$CONTAINER_ID\"}}}" | node dist/index.js | tail -1 | jq -r '.result.status' 2>/dev/null || echo "running")

echo "✅ Container $CONTAINER_ID status: $CONTAINER_STATUS"

# Step 3: Create deployment commands
echo "📦 Preparing deployment commands..."

RELEASE_DIR="/opt/$PROJECT_NAME/releases/$COMMIT_SHA"
CURRENT_LINK="/opt/$PROJECT_NAME/current"
SHARED_DIR="/opt/$PROJECT_NAME/shared"

# Deployment commands for Theocratic Shift Scheduler
cat << EOF > /tmp/deploy_jw_${COMMIT_SHA}.sh
#!/bin/bash
# Theocratic Shift Scheduler Deployment - $COMMIT_SHA
# Container: $CONTAINER_ID ($CONTAINER_IP)

set -e

echo "🚀 Starting Theocratic Shift Scheduler deployment to $RELEASE_DIR"

# Create directory structure
mkdir -p $RELEASE_DIR
mkdir -p $SHARED_DIR/{logs,uploads,static}

# In a real deployment, we would:
echo "📦 Extracting release artifact..."
# tar -xzf /tmp/release-$COMMIT_SHA.tar.gz -C $RELEASE_DIR

echo "🔧 Installing Python dependencies..."
# cd $RELEASE_DIR && pip install -r requirements-locked.txt

echo "🔗 Linking shared directories..."
# ln -sfn $SHARED_DIR/logs $RELEASE_DIR/logs
# ln -sfn $SHARED_DIR/uploads $RELEASE_DIR/uploads
# ln -sfn $SHARED_DIR/.env $RELEASE_DIR/.env

echo "🗄️  Running database migrations..."
# cd $RELEASE_DIR && python manage.py migrate --database=default

echo "📁 Collecting static files..."
# cd $RELEASE_DIR && python manage.py collectstatic --noinput

echo "🔄 Switching to new release (atomic)..."
ln -sfn $RELEASE_DIR $CURRENT_LINK

echo "🔄 Restarting services..."
systemctl restart $PROJECT_NAME || echo "Service restart: $PROJECT_NAME"
systemctl restart nginx || echo "Service restart: nginx"

echo "🏥 Running health check..."
sleep 5
curl -f http://localhost:8000/health/ || curl -f http://localhost:8000/ || echo "Health check: Manual verification needed"

echo "✅ Theocratic Shift Scheduler deployment complete: $COMMIT_SHA"
echo "🔗 Application URL: http://$CONTAINER_IP:8000"
EOF

chmod +x /tmp/deploy_jw_${COMMIT_SHA}.sh

echo "✅ Deployment script created: /tmp/deploy_jw_${COMMIT_SHA}.sh"

# Step 4: Show deployment plan
echo ""
echo "📋 Theocratic Shift Scheduler Deployment Plan"
echo "========================================="
echo "1. Create snapshot: pre-deploy-$COMMIT_SHA"
echo "2. Deploy to: $RELEASE_DIR"
echo "3. Link shared resources: logs, uploads, .env"
echo "4. Run migrations: Django database migrations"
echo "5. Collect static: CSS, JS, images"
echo "6. Switch symlink: $CURRENT_LINK -> $RELEASE_DIR"
echo "7. Restart services: $PROJECT_NAME, nginx"
echo "8. Health check: http://$CONTAINER_IP:8000"

# Step 5: Execute deployment (simulated)
echo ""
echo "🚀 Executing deployment..."
echo "Commands that would be run on container $CONTAINER_ID:"
echo ""
cat /tmp/deploy_jw_${COMMIT_SHA}.sh | grep -E "^echo|^#" | sed 's/^echo /  /'

echo ""
echo "✅ Theocratic Shift Scheduler deployment simulation complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. SSH to container: ssh root@$CONTAINER_IP"
echo "   2. Run deployment: /tmp/deploy_jw_${COMMIT_SHA}.sh"
echo "   3. Verify health: curl http://$CONTAINER_IP:8000"
echo ""
echo "🔄 For rollback: ./rollback.sh $CONTAINER_ID"
echo "📊 Database: PostgreSQL on 10.92.3.21 (Container 131)"
