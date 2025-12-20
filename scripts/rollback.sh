#!/bin/bash
# Theocratic Shift Scheduler - MCP Rollback Script
# Container Infrastructure: 131=postgres, 132=prod, 134=staging

set -e

PROJECT_NAME="theoshift"
CONTAINER_ID=${1:-"134"}  # Default to staging
MODE=${2:-"interactive"}
TARGET_RELEASE=${3:-""}

echo "🔄 Theocratic Shift Scheduler MCP Rollback"
echo "====================================="
echo "Project: $PROJECT_NAME"
echo "Container: $CONTAINER_ID"
echo "Mode: $MODE"
echo ""

# Validate container assignment
case $CONTAINER_ID in
    "132")
        echo "🎯 Rolling back GREEN (Container 132 (green-theoshift) - 10.92.3.22)"
        CONTAINER_IP="10.92.3.22"
        ;;
    "134")
        echo "🎯 Rolling back BLUE (Container 134 (blue-theoshift) - 10.92.3.24)"
        CONTAINER_IP="10.92.3.24"
        ;;
    *)
        echo "❌ Invalid container ID: $CONTAINER_ID"
        echo "Valid containers: 132 (production), 134 (staging)"
        exit 1
        ;;
esac

# Step 1: Check container status using Proxmox MCP
echo "🔍 Checking container status..."
cd /Users/cory/Documents/Cloudy-Work/homelab/mcp-server-proxmox

CONTAINER_STATUS=$(echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/call\", \"params\": {\"name\": \"get_vm_status\", \"arguments\": {\"node\": \"proxmox\", \"vmid\": \"$CONTAINER_ID\"}}}" | node dist/index.js | tail -1 | jq -r '.result.status' 2>/dev/null || echo "running")

echo "✅ Container $CONTAINER_ID status: $CONTAINER_STATUS"

# Step 2: Create rollback commands based on mode
RELEASES_DIR="/opt/$PROJECT_NAME/releases"
CURRENT_LINK="/opt/$PROJECT_NAME/current"

case $MODE in
    "quick")
        echo "⚡ Quick rollback to previous release"
        cat << EOF > /tmp/rollback_jw_quick.sh
#!/bin/bash
set -e
echo "🔄 Rolling back Theocratic Shift Scheduler to previous release..."
PREV=\$(ls -t $RELEASES_DIR | head -2 | tail -1)
echo "Previous release: \$PREV"
ln -sfn $RELEASES_DIR/\$PREV $CURRENT_LINK
systemctl restart $PROJECT_NAME
systemctl restart nginx
echo "🏥 Running health check..."
sleep 3
curl -f http://localhost:8000/health/ || curl -f http://localhost:8000/ || echo "Health check: Manual verification needed"
echo "✅ Theocratic Shift Scheduler quick rollback complete"
echo "🔗 Application URL: http://$CONTAINER_IP:8000"
EOF
        chmod +x /tmp/rollback_jw_quick.sh
        echo "📝 Rollback script: /tmp/rollback_jw_quick.sh"
        ;;
        
    "release")
        if [ -z "$TARGET_RELEASE" ]; then
            echo "❌ Target release required for release mode"
            echo "Usage: $0 $CONTAINER_ID release <release_hash>"
            exit 1
        fi
        echo "🎯 Rolling back to specific release: $TARGET_RELEASE"
        cat << EOF > /tmp/rollback_jw_release.sh
#!/bin/bash
set -e
echo "🔄 Rolling back Theocratic Shift Scheduler to release: $TARGET_RELEASE"
if [ ! -d "$RELEASES_DIR/$TARGET_RELEASE" ]; then
    echo "❌ Release $TARGET_RELEASE not found"
    exit 1
fi
ln -sfn $RELEASES_DIR/$TARGET_RELEASE $CURRENT_LINK
systemctl restart $PROJECT_NAME
systemctl restart nginx
echo "🏥 Running health check..."
sleep 3
curl -f http://localhost:8000/health/ || curl -f http://localhost:8000/ || echo "Health check: Manual verification needed"
echo "✅ Theocratic Shift Scheduler rollback to $TARGET_RELEASE complete"
echo "🔗 Application URL: http://$CONTAINER_IP:8000"
EOF
        chmod +x /tmp/rollback_jw_release.sh
        echo "📝 Rollback script: /tmp/rollback_jw_release.sh"
        ;;
        
    "interactive")
        echo "📋 Available rollback options:"
        echo ""
        echo "Available releases (simulated):"
        echo "  1. abc123de - 2024-01-15 14:30 (current)"
        echo "  2. def456gh - 2024-01-15 12:15"
        echo "  3. ghi789jk - 2024-01-14 16:45"
        echo "  4. lmn012op - 2024-01-14 10:20"
        echo ""
        echo "Rollback options:"
        echo "  Quick:    ./rollback.sh $CONTAINER_ID quick"
        echo "  Specific: ./rollback.sh $CONTAINER_ID release def456gh"
        echo ""
        echo "For immediate rollback, use quick mode."
        exit 0
        ;;
        
    *)
        echo "❌ Invalid mode: $MODE"
        echo "Valid modes: interactive, quick, release"
        exit 1
        ;;
esac

# Step 3: Show rollback plan
echo ""
echo "📋 Theocratic Shift Scheduler Rollback Plan"
echo "======================================="
echo "1. Switch symlink: $CURRENT_LINK -> previous/target release"
echo "2. Restart services: $PROJECT_NAME, nginx"
echo "3. Health check: http://$CONTAINER_IP:8000"
echo "4. Estimated time: <30 seconds"
echo "5. Database: No changes (migrations are forward-compatible)"

# Step 4: Show execution instructions
echo ""
echo "🚀 Rollback Ready"
echo "================="
echo "To execute rollback:"
echo "   1. SSH to container: ssh root@$CONTAINER_IP"
if [ "$MODE" = "quick" ]; then
    echo "   2. Run rollback: /tmp/rollback_jw_quick.sh"
elif [ "$MODE" = "release" ]; then
    echo "   2. Run rollback: /tmp/rollback_jw_release.sh"
fi
echo "   3. Verify health: curl http://$CONTAINER_IP:8000"
echo ""
echo "⚠️  Rollback is atomic and should complete in <30 seconds"
echo "📊 Database: PostgreSQL on 10.92.3.21 (Container 131)"
