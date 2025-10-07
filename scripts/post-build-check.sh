#!/bin/bash

# APEX GUARDIAN Post-Build Verification Script
# Ensures system is operational after every build

echo "🛡️ APEX GUARDIAN POST-BUILD VERIFICATION"
echo "========================================"

# Function to check server status
check_server_status() {
    echo "1. Checking Next.js server process..."
    if ps aux | grep "next-server" | grep -v grep > /dev/null; then
        echo "   ✅ Next.js server process running"
        ps aux | grep "next-server" | grep -v grep | head -1
    else
        echo "   ❌ Next.js server process NOT running"
        return 1
    fi
    
    echo "2. Checking port 3001..."
    if ss -tlnp | grep -q ":3001"; then
        echo "   ✅ Port 3001 is listening"
        ss -tlnp | grep ":3001"
    else
        echo "   ❌ Port 3001 NOT listening"
        return 1
    fi
    
    echo "3. Testing basic connectivity..."
    local status_code=$(curl -s -w "%{http_code}" "http://localhost:3001/auth/signin" -o /dev/null)
    if [ "$status_code" = "200" ]; then
        echo "   ✅ Server responding with 200 OK"
    else
        echo "   ❌ Server returning status: $status_code"
        return 1
    fi
    
    echo "4. Testing CSS file serving..."
    local css_file=$(curl -s "http://localhost:3001/auth/signin" | grep -o "/_next/static/css/[^\"]*" | head -1)
    if [ -n "$css_file" ]; then
        local css_status=$(curl -s -w "%{http_code}" "http://localhost:3001$css_file" -o /dev/null)
        if [ "$css_status" = "200" ]; then
            echo "   ✅ CSS file serving correctly: $css_file"
        else
            echo "   ❌ CSS file error ($css_status): $css_file"
            return 1
        fi
    else
        echo "   ❌ No CSS file found in HTML"
        return 1
    fi
    
    return 0
}

# Function to restart server if needed
restart_server_if_needed() {
    echo "🔄 Attempting server restart..."
    pkill -f "next-server" 2>/dev/null
    sleep 2
    
    echo "Starting server on port 3001..."
    PORT=3001 npm start > server.log 2>&1 &
    
    echo "Waiting for server startup..."
    sleep 10
    
    if check_server_status; then
        echo "✅ Server restart successful"
        return 0
    else
        echo "❌ Server restart failed"
        return 1
    fi
}

# Main verification logic
echo "Starting post-build verification..."

if check_server_status; then
    echo ""
    echo "🎉 POST-BUILD VERIFICATION PASSED"
    echo "✅ System is operational and ready"
    exit 0
else
    echo ""
    echo "⚠️  POST-BUILD VERIFICATION FAILED"
    echo "Attempting automatic recovery..."
    
    if restart_server_if_needed; then
        echo ""
        echo "🎉 RECOVERY SUCCESSFUL"
        echo "✅ System is now operational"
        exit 0
    else
        echo ""
        echo "❌ RECOVERY FAILED"
        echo "Manual intervention required"
        exit 1
    fi
fi
