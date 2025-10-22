#!/bin/bash

# APEX GUARDIAN: 502 Error Detection and Recovery System
# This script systematically detects and fixes 502 errors

set -e

# Configuration
APP_URL="http://10.92.3.24:3001"
APP_DIR="/opt/jw-attendant-scheduler"
LOG_FILE="/tmp/apex-502-fixer.log"
MAX_RETRIES=3
RETRY_DELAY=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if application is responding
check_app_health() {
    local url="$1"
    local timeout=10
    
    log "🔍 Checking application health at $url"
    
    # Test basic connectivity
    if ! curl -s --max-time $timeout -o /dev/null -w "%{http_code}" "$url" > /tmp/http_code 2>/dev/null; then
        error "❌ Cannot connect to application"
        return 1
    fi
    
    local http_code=$(cat /tmp/http_code)
    log "HTTP Response Code: $http_code"
    
    case $http_code in
        000)
            error "❌ Connection failed (000) - Application not responding"
            return 1
            ;;
        502)
            error "❌ Bad Gateway (502) - Application server down"
            return 1
            ;;
        503)
            error "❌ Service Unavailable (503) - Application overloaded"
            return 1
            ;;
        200|307|301|302)
            success "✅ Application responding (HTTP $http_code)"
            return 0
            ;;
        *)
            warning "⚠️ Unexpected response code: $http_code"
            return 1
            ;;
    esac
}

# Check if Node.js processes are running
check_node_processes() {
    log "🔍 Checking Node.js processes"
    
    if ssh jws 'ps aux | grep -E "(node|npm)" | grep -v grep' > /tmp/node_processes 2>/dev/null; then
        success "✅ Node.js processes found:"
        cat /tmp/node_processes | while read line; do
            log "  $line"
        done
        return 0
    else
        error "❌ No Node.js processes running"
        return 1
    fi
}

# Check port availability
check_port() {
    local port="$1"
    log "🔍 Checking if port $port is listening"
    
    if ssh jws "netstat -tlnp | grep :$port" > /tmp/port_check 2>/dev/null; then
        success "✅ Port $port is listening:"
        cat /tmp/port_check | while read line; do
            log "  $line"
        done
        return 0
    else
        error "❌ Port $port is not listening"
        return 1
    fi
}

# Kill existing Node.js processes
kill_node_processes() {
    log "🔄 Killing existing Node.js processes"
    
    if ssh jws 'pkill -f next' 2>/dev/null; then
        success "✅ Killed existing processes"
        sleep 3
    else
        log "ℹ️ No processes to kill"
    fi
}

# Start the application
start_application() {
    log "🚀 Starting JW Attendant Scheduler application"
    
    # Start application in background
    ssh jws "cd $APP_DIR && PORT=3001 nohup npm run dev > /tmp/app.log 2>&1 &" 2>/dev/null
    
    # Wait for application to start
    local wait_time=0
    local max_wait=60
    
    while [ $wait_time -lt $max_wait ]; do
        sleep 2
        wait_time=$((wait_time + 2))
        
        if check_port 3001; then
            success "✅ Application started successfully"
            return 0
        fi
        
        log "⏳ Waiting for application to start... (${wait_time}s/${max_wait}s)"
    done
    
    error "❌ Application failed to start within ${max_wait} seconds"
    return 1
}

# Regenerate Prisma client
regenerate_prisma() {
    log "🔧 Regenerating Prisma client"
    
    if ssh jws "cd $APP_DIR && npx prisma generate" > /tmp/prisma_gen.log 2>&1; then
        success "✅ Prisma client regenerated"
        return 0
    else
        error "❌ Failed to regenerate Prisma client"
        cat /tmp/prisma_gen.log
        return 1
    fi
}

# Full recovery process
full_recovery() {
    log "🛠️ Starting full 502 error recovery process"
    
    # Step 1: Kill existing processes
    kill_node_processes
    
    # Step 2: Regenerate Prisma client
    regenerate_prisma
    
    # Step 3: Start application
    if start_application; then
        # Step 4: Verify health
        sleep 5
        if check_app_health "$APP_URL"; then
            success "🎉 Full recovery completed successfully!"
            return 0
        else
            error "❌ Application started but health check failed"
            return 1
        fi
    else
        error "❌ Failed to start application"
        return 1
    fi
}

# Main recovery function with retries
recover_502() {
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log "🔄 Recovery attempt $attempt of $MAX_RETRIES"
        
        if full_recovery; then
            success "✅ Recovery successful on attempt $attempt"
            return 0
        else
            error "❌ Recovery attempt $attempt failed"
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                warning "⏳ Waiting ${RETRY_DELAY} seconds before next attempt..."
                sleep $RETRY_DELAY
            fi
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "❌ All recovery attempts failed"
    return 1
}

# Quick health check and fix
quick_fix() {
    log "🚀 APEX GUARDIAN: Quick 502 Fix"
    
    # Check current status
    if check_app_health "$APP_URL"; then
        success "✅ Application is healthy - no fix needed"
        return 0
    fi
    
    # Check processes
    if ! check_node_processes; then
        log "🔄 No processes running - starting application"
        if start_application; then
            sleep 5
            if check_app_health "$APP_URL"; then
                success "✅ Quick fix successful!"
                return 0
            fi
        fi
    fi
    
    # If quick fix didn't work, do full recovery
    warning "⚠️ Quick fix failed - attempting full recovery"
    recover_502
}

# Diagnostic information
show_diagnostics() {
    log "🔍 APEX GUARDIAN: System Diagnostics"
    
    echo "=== Application Health ==="
    check_app_health "$APP_URL" || true
    
    echo -e "\n=== Node.js Processes ==="
    check_node_processes || true
    
    echo -e "\n=== Port Status ==="
    check_port 3001 || true
    
    echo -e "\n=== System Load ==="
    ssh jws 'uptime' 2>/dev/null || echo "Cannot check system load"
    
    echo -e "\n=== Disk Space ==="
    ssh jws 'df -h /' 2>/dev/null || echo "Cannot check disk space"
    
    echo -e "\n=== Recent Application Logs ==="
    ssh jws 'tail -20 /tmp/app.log 2>/dev/null' || echo "No application logs found"
}

# Main function
main() {
    case "${1:-quick}" in
        "quick"|"fix")
            quick_fix
            ;;
        "recover"|"full")
            recover_502
            ;;
        "check"|"health")
            check_app_health "$APP_URL"
            ;;
        "diagnostics"|"diag")
            show_diagnostics
            ;;
        "start")
            start_application
            ;;
        "restart")
            kill_node_processes
            start_application
            ;;
        *)
            echo "APEX GUARDIAN: 502 Error Fixer"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  quick      - Quick health check and fix (default)"
            echo "  recover    - Full recovery process with retries"
            echo "  check      - Check application health only"
            echo "  diagnostics- Show detailed system diagnostics"
            echo "  start      - Start application"
            echo "  restart    - Restart application"
            echo ""
            echo "Examples:"
            echo "  $0 quick     # Quick fix for 502 errors"
            echo "  $0 recover   # Full recovery process"
            echo "  $0 diag      # Show diagnostics"
            ;;
    esac
}

# Run main function
main "$@"
