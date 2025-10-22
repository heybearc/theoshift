#!/bin/bash

# Comprehensive Styling Diagnostic
echo "🎨 JW Attendant Scheduler - Styling Diagnostic"
echo "=============================================="

PROD_SERVER="jwa"
STAGING_SERVER="jws"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

echo "1. 📁 CSS Configuration Files Check..."
echo "Local files:"
ls -la tailwind.config.js postcss.config.js styles/ 2>/dev/null || echo "Missing local CSS files"

echo ""
echo "Staging CSS files:"
timeout 20 ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && ls -la tailwind.config.js postcss.config.js styles/ 2>/dev/null" || echo "SSH timeout"

echo ""
echo "Production CSS files:"
timeout 20 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && ls -la tailwind.config.js postcss.config.js styles/ 2>/dev/null" || echo "SSH timeout"

echo ""
echo "2. 🔧 Build Output Analysis..."
echo "Staging build CSS:"
timeout 20 ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && find .next -name '*.css' -exec ls -la {} \; 2>/dev/null | head -5" || echo "SSH timeout"

echo ""
echo "Production build CSS:"
timeout 20 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && find .next -name '*.css' -exec ls -la {} \; 2>/dev/null | head -5" || echo "SSH timeout"

echo ""
echo "3. 📄 _app.tsx Import Check..."
echo "Local _app.tsx:"
grep -n "import.*css" pages/_app.tsx 2>/dev/null || echo "No CSS imports found"

echo ""
echo "Staging _app.tsx:"
timeout 20 ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && grep -n 'import.*css' pages/_app.tsx 2>/dev/null" || echo "SSH timeout"

echo ""
echo "Production _app.tsx:"
timeout 20 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && grep -n 'import.*css' pages/_app.tsx 2>/dev/null" || echo "SSH timeout"

echo ""
echo "4. 🌐 HTTP Response Headers..."
echo "Staging CSS response:"
timeout 15 ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "curl -I http://localhost:3001/_next/static/css/ 2>/dev/null | head -5" || echo "SSH timeout"

echo ""
echo "Production CSS response:"
timeout 15 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "curl -I http://localhost:3001/_next/static/css/ 2>/dev/null | head -5" || echo "SSH timeout"

echo ""
echo "5. 📊 Package.json Comparison..."
echo "Staging Tailwind version:"
timeout 15 ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && grep tailwindcss package.json 2>/dev/null" || echo "SSH timeout"

echo ""
echo "Production Tailwind version:"
timeout 15 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && grep tailwindcss package.json 2>/dev/null" || echo "SSH timeout"

echo ""
echo "6. 🔍 Environment Differences..."
echo "Staging environment:"
timeout 15 ssh -F "$SSH_CONFIG" "$STAGING_SERVER" "cd /opt/jw-attendant-scheduler && grep NODE_ENV .env 2>/dev/null" || echo "SSH timeout"

echo ""
echo "Production environment:"
timeout 15 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "cd /opt/jw-attendant-scheduler && grep NODE_ENV .env 2>/dev/null" || echo "SSH timeout"

echo ""
echo "🎯 Styling diagnostic complete!"
echo "💡 Key things to check:"
echo "   - CSS files should exist in both environments"
echo "   - Build should generate CSS files in .next/"
echo "   - _app.tsx should import styles/globals.css"
echo "   - HTTP responses should serve CSS files"
