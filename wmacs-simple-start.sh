#!/bin/bash

# WMACS Simple Start - Non-blocking Next.js startup
# Recommended by WMACS Research Advisor for reliable deployment

echo "🚀 WMACS Simple Start: Starting Next.js application..."

# Kill any existing processes
pkill -f "next-server" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Wait for processes to terminate
sleep 2

# Start application in development mode with proper logging
cd /opt/jw-attendant-scheduler
PORT=3001 npm run dev > /var/log/nextjs-clean-auth.log 2>&1 &
APP_PID=$!

# Save PID for monitoring
echo $APP_PID > nextjs.pid

# Wait a moment and verify startup
sleep 3

# Check if process is still running
if kill -0 $APP_PID 2>/dev/null; then
    echo "✅ WMACS Simple Start: Application started successfully (PID: $APP_PID)"
    echo "🌐 Application should be available at: http://10.92.3.24:3001"
    exit 0
else
    echo "❌ WMACS Simple Start: Application failed to start"
    exit 1
fi
