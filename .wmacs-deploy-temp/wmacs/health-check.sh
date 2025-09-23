#!/bin/bash

# WMACS Guardian System Health Check
# Validates all components are operational and synchronized

set -e

echo "🏥 WMACS Guardian System Health Check"
echo "====================================="

MASTER_DIR="/Users/cory/Documents/Cloudy-Work/shared/wmacs-guardian-system"
PROJECTS=(
    "/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler"
    "/Users/cory/Documents/Cloudy-Work/applications/ldc-construction-tools"
)

HEALTH_STATUS="HEALTHY"
ISSUES_FOUND=0

# Check master repository
echo ""
echo "📋 Master Repository Health"
echo "-------------------------"

if [ -d "$MASTER_DIR" ]; then
    echo "✅ Master directory exists"
    
    # Check core files
    core_files=("wmacs-guardian.js" "wmacs-research-advisor.js" "wmacs-auto-advisor.js")
    for file in "${core_files[@]}"; do
        if [ -f "$MASTER_DIR/$file" ]; then
            echo "✅ $file present"
        else
            echo "❌ $file missing"
            HEALTH_STATUS="DEGRADED"
            ((ISSUES_FOUND++))
        fi
    done
    
    # Check git status
    cd "$MASTER_DIR"
    if git status &>/dev/null; then
        echo "✅ Git repository operational"
        
        # Check for uncommitted changes
        if [ -n "$(git status --porcelain)" ]; then
            echo "⚠️  Uncommitted changes detected"
            git status --short
        fi
    else
        echo "❌ Git repository issues"
        HEALTH_STATUS="DEGRADED"
        ((ISSUES_FOUND++))
    fi
else
    echo "❌ Master directory not found"
    HEALTH_STATUS="CRITICAL"
    ((ISSUES_FOUND++))
fi

# Check project synchronization
echo ""
echo "🔄 Project Synchronization Health"
echo "--------------------------------"

for project in "${PROJECTS[@]}"; do
    project_name=$(basename "$project")
    echo ""
    echo "Checking: $project_name"
    
    if [ -d "$project" ]; then
        echo "  ✅ Project directory exists"
        
        # Check wmacs directory
        if [ -d "$project/wmacs" ]; then
            echo "  ✅ WMACS directory present"
            
            # Check core files synchronization
            for file in "${core_files[@]}"; do
                if [ -f "$project/wmacs/$file" ]; then
                    # Compare file modification times
                    master_time=$(stat -f %m "$MASTER_DIR/$file" 2>/dev/null || echo "0")
                    project_time=$(stat -f %m "$project/wmacs/$file" 2>/dev/null || echo "0")
                    
                    if [ "$master_time" -gt "$project_time" ]; then
                        echo "  ⚠️  $file outdated (master newer)"
                        HEALTH_STATUS="DEGRADED"
                        ((ISSUES_FOUND++))
                    else
                        echo "  ✅ $file synchronized"
                    fi
                else
                    echo "  ❌ $file missing"
                    HEALTH_STATUS="DEGRADED"
                    ((ISSUES_FOUND++))
                fi
            done
            
            # Check configuration
            if [ -f "$project/wmacs-config.js" ]; then
                echo "  ✅ Project configuration present"
            else
                echo "  ⚠️  Project configuration missing"
                HEALTH_STATUS="DEGRADED"
                ((ISSUES_FOUND++))
            fi
        else
            echo "  ❌ WMACS directory missing"
            HEALTH_STATUS="CRITICAL"
            ((ISSUES_FOUND++))
        fi
    else
        echo "  ❌ Project directory not found"
        HEALTH_STATUS="CRITICAL"
        ((ISSUES_FOUND++))
    fi
done

# Test core functionality
echo ""
echo "🧪 Functionality Tests"
echo "---------------------"

# Test research advisor
echo "Testing Research Advisor..."
if node "$MASTER_DIR/wmacs-research-advisor.js" analyze "test suggestion" &>/dev/null; then
    echo "✅ Research Advisor functional"
else
    echo "❌ Research Advisor failed"
    HEALTH_STATUS="DEGRADED"
    ((ISSUES_FOUND++))
fi

# Test auto advisor
echo "Testing Auto Advisor..."
if node "$MASTER_DIR/wmacs-auto-advisor.js" monitor "test input" &>/dev/null; then
    echo "✅ Auto Advisor functional"
else
    echo "❌ Auto Advisor failed"
    HEALTH_STATUS="DEGRADED"
    ((ISSUES_FOUND++))
fi

# Container connectivity test
echo ""
echo "🌐 Container Connectivity"
echo "------------------------"

containers=("10.92.3.21" "10.92.3.22" "10.92.3.23" "10.92.3.24" "10.92.3.25")
for container in "${containers[@]}"; do
    if ping -c 1 -W 5 "$container" &>/dev/null; then
        echo "✅ $container reachable"
    else
        echo "⚠️  $container unreachable"
        # Don't mark as critical since containers may be offline
    fi
done

# Final health assessment
echo ""
echo "🎯 Health Assessment Summary"
echo "============================"
echo "Status: $HEALTH_STATUS"
echo "Issues Found: $ISSUES_FOUND"

case $HEALTH_STATUS in
    "HEALTHY")
        echo "✅ All systems operational"
        echo "🚀 WMACS Guardian ready for development work"
        exit 0
        ;;
    "DEGRADED")
        echo "⚠️  System operational with issues"
        echo "🔧 Recommended actions:"
        echo "   - Run ./sync-wmacs.sh to update projects"
        echo "   - Review and resolve identified issues"
        echo "   - Re-run health check after fixes"
        exit 1
        ;;
    "CRITICAL")
        echo "❌ Critical issues detected"
        echo "🚨 Immediate action required:"
        echo "   - Restore missing components"
        echo "   - Verify system installation"
        echo "   - Contact system administrator"
        exit 2
        ;;
esac
