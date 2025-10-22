#!/bin/bash

# APEX GUARDIAN ROLLBACK SCRIPT
# Event Details Page Redesign Rollback
# Created: $(date)

echo "🔄 APEX GUARDIAN: Rolling back Event Details redesign..."

# Stop the application
echo "📋 Stopping application..."
ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler && pkill -f next"

# Restore backup files
echo "📁 Restoring backup files..."
ssh root@10.92.3.24 "cp /tmp/apex-guardian-backup/index.tsx /opt/jw-attendant-scheduler/pages/events/[id]/index.tsx"
ssh root@10.92.3.24 "cp /tmp/apex-guardian-backup/[id].ts /opt/jw-attendant-scheduler/pages/api/events/[id].ts"

# Rebuild application
echo "🔨 Rebuilding application..."
ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler && rm -rf .next && npm run build"

# Restart application
echo "🚀 Restarting application..."
ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler && PORT=3001 npm start &"

echo "✅ APEX GUARDIAN: Rollback completed successfully!"
echo "🌐 Application available at: https://jw-staging.cloudigan.net"
echo ""
echo "📋 ROLLBACK SUMMARY:"
echo "- Event details page restored to original layout"
echo "- API endpoints restored to previous version"
echo "- Application rebuilt and restarted"
echo ""
echo "⚠️  Note: Any capacity/attendants data saved during testing will remain in database"
