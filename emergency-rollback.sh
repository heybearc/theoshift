#!/bin/bash

# 🚨 EMERGENCY ROLLBACK SCRIPT
# Quickly restore staging to last known good state

set -e

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[ROLLBACK]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Stop current app
print_status "Stopping current application..."
ssh jws "pkill -f 'next start' || true"

# Method 1: Try filesystem backup restore
print_status "Attempting filesystem backup restore..."
LAST_BACKUP=$(ssh jws "ls -t /opt/theoshift.backup.* 2>/dev/null | head -1" || echo "")

if [ -n "$LAST_BACKUP" ]; then
    print_status "Found backup: $LAST_BACKUP"
    ssh jws "
        rm -rf /opt/theoshift
        mv '$LAST_BACKUP' /opt/theoshift
        cd /opt/theoshift
        PORT=3001 nohup npm start > /tmp/app.log 2>&1 &
    "
    
    sleep 10
    
    # Verify restoration
    if curl -s "http://10.92.3.24:3001/" > /dev/null; then
        print_success "✅ FILESYSTEM ROLLBACK SUCCESSFUL"
        exit 0
    else
        print_warning "Filesystem rollback failed, trying git rollback..."
    fi
fi

# Method 2: Git-based rollback to last safe tag
print_status "Attempting git-based rollback..."
cd /Users/cory/Documents/Cloudy-Work/applications/theoshift

# Find last safe tag
LAST_SAFE_TAG=$(git tag | grep "safe-" | sort -r | head -1)

if [ -n "$LAST_SAFE_TAG" ]; then
    print_status "Found safe tag: $LAST_SAFE_TAG"
    
    # Checkout safe tag
    git checkout "tags/$LAST_SAFE_TAG" -b "emergency-rollback-$(date +%H%M%S)"
    
    # Deploy safe version
    ./wmacs-clean-staging-deploy.sh
    
    # Verify rollback
    sleep 5
    if curl -s "http://10.92.3.24:3001/" > /dev/null; then
        print_success "✅ GIT ROLLBACK SUCCESSFUL"
        exit 0
    else
        print_warning "Git rollback failed, trying commit rollback..."
    fi
fi

# Method 3: Reset to last known good commit on staging
print_status "Attempting commit-based rollback..."
git checkout staging

# Get last 5 commits and try each one
for commit in $(git log --oneline -5 --format="%H"); do
    print_status "Trying commit: $commit"
    
    git reset --hard "$commit"
    
    if ./wmacs-clean-staging-deploy.sh; then
        sleep 5
        if curl -s "http://10.92.3.24:3001/" > /dev/null; then
            print_success "✅ COMMIT ROLLBACK SUCCESSFUL to $commit"
            exit 0
        fi
    fi
done

# Method 4: Nuclear option - reset to main branch
print_warning "All rollback methods failed, attempting reset to main branch..."
git checkout main
git checkout staging
git reset --hard main

if ./wmacs-clean-staging-deploy.sh; then
    sleep 5
    if curl -s "http://10.92.3.24:3001/" > /dev/null; then
        print_success "✅ MAIN BRANCH ROLLBACK SUCCESSFUL"
        exit 0
    fi
fi

# If we get here, everything failed
print_error "❌ ALL ROLLBACK METHODS FAILED"
print_error "MANUAL INTERVENTION REQUIRED"
print_error "Contact system administrator immediately"

echo ""
echo "EMERGENCY CONTACTS:"
echo "- Check server logs: ssh jws 'tail -50 /tmp/app.log'"
echo "- Check server status: ssh jws 'ps aux | grep next'"
echo "- Manual restart: ssh jws 'cd /opt/theoshift && PORT=3001 nohup npm start > /tmp/app.log 2>&1 &'"

exit 1
