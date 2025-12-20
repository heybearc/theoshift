#!/bin/bash

# 🛡️ SAFETY CHECKPOINT CREATOR
# Create rollback points before staging development

set -e

echo "🛡️ CREATING SAFETY CHECKPOINT"
echo "============================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[CHECKPOINT]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Create timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

print_status "Creating checkpoint for timestamp: $TIMESTAMP"

# 1. Create git tag for current state
print_status "Creating git safety tag..."
git tag "safe-$TIMESTAMP" staging
git push origin --tags
print_success "Git tag created: safe-$TIMESTAMP"

# 2. Create filesystem backup on staging server
print_status "Creating filesystem backup on staging server..."
ssh jws "
    cd /opt
    if [ -d theoshift ]; then
        cp -r theoshift theoshift.backup.$TIMESTAMP
        echo 'Backup created: /opt/theoshift.backup.$TIMESTAMP'
    else
        echo 'ERROR: /opt/theoshift not found'
        exit 1
    fi
"
print_success "Filesystem backup created"

# 3. Verify current system health
print_status "Verifying current system health..."

# Test critical endpoints
MAIN_STATUS=$(curl -s -w "%{http_code}" "http://10.92.3.24:3001/" -o /dev/null)
ADMIN_STATUS=$(curl -s -w "%{http_code}" "http://10.92.3.24:3001/admin" -o /dev/null)
EVENTS_STATUS=$(curl -s -w "%{http_code}" "http://10.92.3.24:3001/events" -o /dev/null)

echo ""
echo "SYSTEM HEALTH CHECK:"
echo "- Main app (/): $MAIN_STATUS"
echo "- Admin panel (/admin): $ADMIN_STATUS" 
echo "- Events page (/events): $EVENTS_STATUS"

if [[ "$MAIN_STATUS" =~ ^(200|307)$ ]] && [[ "$ADMIN_STATUS" =~ ^(200|307)$ ]] && [[ "$EVENTS_STATUS" =~ ^(200|307)$ ]]; then
    print_success "✅ System health verified - Safe to proceed with development"
else
    echo "❌ System health check failed - DO NOT proceed with development"
    echo "Fix current issues before creating checkpoint"
    exit 1
fi

# 4. Clean up old backups (keep last 5)
print_status "Cleaning up old backups..."
ssh jws "
    cd /opt
    ls -t theoshift.backup.* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
    echo 'Old backups cleaned up (kept 5 most recent)'
"

# 5. Display rollback instructions
echo ""
echo "🛡️ SAFETY CHECKPOINT CREATED SUCCESSFULLY"
echo "=========================================="
echo ""
echo "ROLLBACK INSTRUCTIONS:"
echo "- Emergency rollback: ./emergency-rollback.sh"
echo "- Manual git rollback: git checkout tags/safe-$TIMESTAMP"
echo "- Manual filesystem rollback: ssh jws 'mv /opt/theoshift.backup.$TIMESTAMP /opt/theoshift'"
echo ""
echo "✅ You can now safely proceed with staging development"
