#!/bin/bash

# Production Disk Cleanup Script
# Clean up space-consuming files and check disk usage

echo "🧹 Production Disk Cleanup"
echo "=========================="

PROD_SERVER="jwa"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"
PROJECT_PATH="/opt/theoshift"

echo "Step 1: Check current disk usage..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    echo 'Overall disk usage:'
    df -h
    echo ''
    echo 'Largest directories in /opt:'
    du -sh /opt/* 2>/dev/null | sort -hr | head -10
"

echo ""
echo "Step 2: Check project directory size..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd $PROJECT_PATH
    echo 'Project directory breakdown:'
    du -sh * 2>/dev/null | sort -hr | head -15
"

echo ""
echo "Step 3: Clean up large files..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd $PROJECT_PATH
    
    # Remove build artifacts
    echo 'Cleaning build artifacts...'
    rm -rf .next/
    rm -rf dist/
    rm -rf build/
    
    # Remove logs
    echo 'Cleaning logs...'
    rm -f *.log
    rm -f logs/*.log 2>/dev/null
    
    # Clean npm cache
    echo 'Cleaning npm cache...'
    npm cache clean --force 2>/dev/null
    
    # Remove node_modules cache
    echo 'Cleaning node_modules cache...'
    find node_modules -name '.cache' -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove temporary files
    echo 'Cleaning temporary files...'
    rm -rf /tmp/npm-* 2>/dev/null || true
    rm -rf /tmp/node-* 2>/dev/null || true
    
    echo 'Cleanup completed'
"

echo ""
echo "Step 4: Check if filesystem needs expansion..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    echo 'Filesystem info:'
    lsblk
    echo ''
    echo 'Mount points:'
    mount | grep -E '(ext4|xfs)'
"

echo ""
echo "Step 5: Final disk usage check..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    echo 'After cleanup:'
    df -h
    echo ''
    cd $PROJECT_PATH
    echo 'Project directory after cleanup:'
    du -sh * 2>/dev/null | sort -hr | head -10
"

echo ""
echo "🎯 Cleanup complete! Check if more space is available now."
