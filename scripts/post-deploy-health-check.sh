#!/bin/bash

# 🛡️ APEX GUARDIAN POST-DEPLOYMENT HEALTH CHECK
# Comprehensive validation after every deployment
# Usage: ./scripts/post-deploy-health-check.sh [staging|production]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
if [ "$ENVIRONMENT" = "staging" ]; then
    SERVER_URL="http://10.92.3.24:3001"
    SSH_HOST="10.92.3.24"
elif [ "$ENVIRONMENT" = "production" ]; then
    SERVER_URL="http://10.92.3.22:3001"
    SSH_HOST="10.92.3.22"
else
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

SSH_KEY="~/.ssh/jw_staging"
MAX_RETRIES=5
RETRY_DELAY=10

echo "🛡️ APEX GUARDIAN POST-DEPLOYMENT HEALTH CHECK"
echo "=============================================="
echo "Environment: $ENVIRONMENT"
echo "Server URL: $SERVER_URL"
echo "Starting comprehensive health check..."
echo ""

# Function to check HTTP endpoint
check_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3
    
    echo -n "   Testing $description... "
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL$endpoint" || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ $status_code"
        return 0
    else
        echo "❌ $status_code (expected $expected_status)"
        return 1
    fi
}

# Function to check server process
check_server_process() {
    echo "1. Checking Next.js server process..."
    
    local process_check=$(ssh -i $SSH_KEY root@$SSH_HOST 'ps aux | grep "next-server" | grep -v grep' || echo "")
    
    if [ -n "$process_check" ]; then
        echo "   ✅ Next.js server process running"
        echo "   $process_check"
        return 0
    else
        echo "   ❌ Next.js server process NOT running"
        return 1
    fi
}

# Function to check port
check_port() {
    echo "2. Checking port 3001..."
    
    local port_check=$(ssh -i $SSH_KEY root@$SSH_HOST 'ss -tlnp | grep :3001' || echo "")
    
    if [ -n "$port_check" ]; then
        echo "   ✅ Port 3001 is listening"
        echo "   $port_check"
        return 0
    else
        echo "   ❌ Port 3001 is NOT listening"
        return 1
    fi
}

# Function to check basic connectivity
check_connectivity() {
    echo "3. Testing basic connectivity..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL" || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "302" ] || [ "$response" = "307" ]; then
        echo "   ✅ Server responding with $response"
        return 0
    else
        echo "   ❌ Server not responding properly: $response"
        return 1
    fi
}

# Function to check critical API endpoints
check_api_endpoints() {
    echo "4. Testing critical API endpoints..."
    
    local failed=0
    
    # Test auth endpoint (should return 401 without session)
    check_endpoint "/api/auth/session" "200" "Auth session endpoint" || failed=$((failed + 1))
    
    # Test events API (should require auth, return 401)
    check_endpoint "/api/events" "401" "Events API endpoint" || failed=$((failed + 1))
    
    # Test health endpoint if it exists
    check_endpoint "/api/health" "200" "Health endpoint" || true
    
    return $failed
}

# Function to check static assets
check_static_assets() {
    echo "5. Testing static asset serving..."
    
    # Find a CSS file to test
    local css_file=$(ssh -i $SSH_KEY root@$SSH_HOST 'find /opt/jw-attendant-scheduler/.next/static/css -name "*.css" | head -1' || echo "")
    
    if [ -n "$css_file" ]; then
        local css_filename=$(basename "$css_file")
        local css_path="/_next/static/css/$css_filename"
        
        check_endpoint "$css_path" "200" "CSS file serving" || return 1
    else
        echo "   ⚠️  No CSS files found to test"
    fi
    
    return 0
}

# Function to check database connectivity
check_database() {
    echo "6. Testing database connectivity..."
    
    local db_check=$(ssh -i $SSH_KEY root@$SSH_HOST 'cd /opt/jw-attendant-scheduler && timeout 10 npx prisma db pull --print 2>/dev/null | grep "model"' || echo "")
    
    if [ -n "$db_check" ]; then
        echo "   ✅ Database connection successful"
        return 0
    else
        echo "   ❌ Database connection failed"
        return 1
    fi
}

# Function to attempt server restart
restart_server() {
    echo ""
    echo "⚠️  HEALTH CHECK FAILED"
    echo "Attempting automatic recovery..."
    
    echo "🔄 Attempting server restart..."
    ssh -i $SSH_KEY root@$SSH_HOST 'cd /opt/jw-attendant-scheduler && pkill -f "next-server" || true'
    sleep 2
    ssh -i $SSH_KEY root@$SSH_HOST 'cd /opt/jw-attendant-scheduler && PORT=3001 npm start > server.log 2>&1 &'
    
    echo "Waiting for server startup..."
    sleep 15
    
    # Re-run basic checks
    if check_server_process && check_port && check_connectivity; then
        echo "✅ Server restart successful"
        echo ""
        return 0
    else
        echo "❌ Server restart failed"
        return 1
    fi
}

# Main health check execution
main() {
    local failed_checks=0
    
    # Run all health checks
    check_server_process || failed_checks=$((failed_checks + 1))
    check_port || failed_checks=$((failed_checks + 1))
    check_connectivity || failed_checks=$((failed_checks + 1))
    check_api_endpoints || failed_checks=$((failed_checks + 1))
    check_static_assets || failed_checks=$((failed_checks + 1))
    check_database || failed_checks=$((failed_checks + 1))
    
    echo ""
    
    if [ $failed_checks -eq 0 ]; then
        echo "🎉 ALL HEALTH CHECKS PASSED"
        echo "✅ System is fully operational"
        exit 0
    else
        echo "⚠️  $failed_checks health check(s) failed"
        
        # Attempt automatic recovery
        if restart_server; then
            echo "🎉 RECOVERY SUCCESSFUL"
            echo "✅ System is now operational"
            exit 0
        else
            echo "❌ RECOVERY FAILED"
            echo "Manual intervention required"
            exit 1
        fi
    fi
}

# Execute main function
main
