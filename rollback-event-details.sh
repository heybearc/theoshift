#!/bin/bash

# APEX GUARDIAN ROLLBACK SCRIPT
# Event Details Page Redesign Rollback
# Created: $(date)

echo "🔄 APEX GUARDIAN: Rolling back Event Details redesign..."

# Stop the application
echo "📋 Stopping application..."
ssh root@10.92.3.24 "cd /opt/theoshift && pkill -f next"

# Restore backup files
echo "📁 Restoring backup files..."
ssh root@10.92.3.24 "cp /tmp/apex-guardian-backup/index.tsx /opt/theoshift/pages/events/[id]/index.tsx"
ssh root@10.92.3.24 "cp /tmp/apex-guardian-backup/[id].ts /opt/theoshift/pages/api/events/[id].ts"

# Rebuild application
echo "🔨 Rebuilding application..."
ssh root@10.92.3.24 "cd /opt/theoshift && rm -rf .next && npm run build"

# Restart application
echo "🚀 Restarting application..."
ssh root@10.92.3.24 "cd /opt/theoshift && PORT=3001 npm start &"

echo "✅ APEX GUARDIAN: Rollback completed successfully!"
echo "🌐 Application available at: https://blue.theoshift.com"
echo ""
echo "📋 ROLLBACK SUMMARY:"
echo "- Event details page restored to original layout"
echo "- API endpoints restored to previous version"
echo "- Application rebuilt and restarted"
echo ""
echo "⚠️  Note: Any capacity/attendants data saved during testing will remain in database"
