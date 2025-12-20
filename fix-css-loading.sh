#!/bin/bash

# Direct CSS Loading Fix
echo "🎨 Fixing CSS Loading Issue"
echo "=========================="

PROD_SERVER="jwa"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

echo "1. Check what CSS files actually exist in build..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/theoshift
echo 'Built CSS files:'
find .next -name '*.css' -type f 2>/dev/null | head -10
echo ''
echo 'CSS file sizes:'
find .next -name '*.css' -type f -exec ls -lh {} \; 2>/dev/null
"

echo ""
echo "2. Check if CSS is being imported correctly..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/theoshift
echo 'App.tsx imports:'
cat pages/_app.tsx
"

echo ""
echo "3. Test CSS file accessibility..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/theoshift
echo 'Testing CSS file access:'
curl -I http://localhost:3001/_next/static/css/ 2>/dev/null | head -5 || echo 'CSS directory not accessible'
"

echo ""
echo "4. Check Next.js config..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/theoshift
echo 'Next.js config:'
cat next.config.js 2>/dev/null || echo 'No next.config.js found'
"

echo ""
echo "5. Force rebuild CSS with verbose output..."
ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
cd /opt/theoshift

# Kill current process
pm2 delete theoshift-green || true

# Clean everything
rm -rf .next node_modules/.cache

# Rebuild with verbose CSS
echo 'Rebuilding with CSS debug...'
npm run build 2>&1 | grep -E '(css|CSS|tailwind|Tailwind)' || echo 'No CSS output in build'

# Check if CSS was generated
echo 'CSS files after build:'
find .next -name '*.css' -type f | head -5

# Restart
pm2 start ecosystem.config.js
"

echo ""
echo "🎯 CSS fix attempt complete!"
