#!/bin/bash

# Comprehensive Production Diagnostic
echo "🔍 JW Attendant Scheduler Production Diagnostic"
echo "=============================================="

PROD_SERVER="jwa"
STAGING_SERVER="jws"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

echo "1. 🚀 Process Management Check..."
timeout 30 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    echo 'PM2 Status:'
    pm2 status || echo 'PM2 not running properly'
    echo ''
    echo 'Node processes:'
    ps aux | grep -E '(npm|node|next)' | grep -v grep
    echo ''
    echo 'Port 3001 binding:'
    ss -tlnp | grep :3001 || netstat -tlnp | grep :3001 || echo 'Port 3001 not bound'
" 2>/dev/null || echo "SSH timeout - connection issues"

echo ""
echo "2. 📁 File System Check..."
timeout 30 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd /opt/jw-attendant-scheduler
    echo 'Directory contents:'
    ls -la | head -15
    echo ''
    echo 'Build directory:'
    ls -la .next/ 2>/dev/null | head -5 || echo 'No .next build directory'
    echo ''
    echo 'Environment file:'
    cat .env | head -10 2>/dev/null || echo 'No .env file'
" 2>/dev/null || echo "SSH timeout"

echo ""
echo "3. 🗄️ Database Check..."
timeout 30 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd /opt/jw-attendant-scheduler
    echo 'Prisma schema check:'
    npx prisma db pull --print 2>/dev/null | head -10 || echo 'Database connection failed'
    echo ''
    echo 'Database URL from env:'
    grep DATABASE_URL .env 2>/dev/null || echo 'No DATABASE_URL found'
" 2>/dev/null || echo "SSH timeout"

echo ""
echo "4. 🎨 CSS/Build Check..."
timeout 30 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd /opt/jw-attendant-scheduler
    echo 'Tailwind config:'
    ls -la tailwind.config.js postcss.config.js 2>/dev/null || echo 'Missing CSS config files'
    echo ''
    echo 'Styles directory:'
    ls -la styles/ 2>/dev/null || echo 'No styles directory'
    echo ''
    echo 'Built CSS files:'
    find .next -name '*.css' 2>/dev/null | head -5 || echo 'No built CSS files found'
" 2>/dev/null || echo "SSH timeout"

echo ""
echo "5. 📊 Staging vs Production Comparison..."
echo "Staging file count:"
timeout 20 ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && find . -name '*.tsx' -o -name '*.ts' -o -name '*.js' | wc -l" 2>/dev/null || echo "SSH timeout"

echo "Production file count:"
timeout 20 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && find . -name '*.tsx' -o -name '*.ts' -o -name '*.js' | wc -l" 2>/dev/null || echo "SSH timeout"

echo ""
echo "6. 🌐 Application Response Check..."
timeout 20 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    curl -I http://localhost:3001 2>/dev/null | head -3 || echo 'Local connection failed'
    echo ''
    curl -I http://10.92.3.22:3001 2>/dev/null | head -3 || echo 'External connection failed'
" 2>/dev/null || echo "SSH timeout"

echo ""
echo "🎯 Diagnostic Complete!"
