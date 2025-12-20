#!/bin/bash

# Rebuild CSS with Tailwind Processing
echo "🎨 Rebuilding CSS with Tailwind..."

PROD_SERVER="jwa"
SSH_CONFIG="/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"

# Rebuild with proper CSS processing
timeout 60 ssh -F "$SSH_CONFIG" "$PROD_SERVER" "
    cd /opt/theoshift
    
    # Clean build cache
    rm -rf .next/
    
    # Rebuild with CSS processing
    npm run build
    
    # Restart application
    pkill -f 'npm.*start' || true
    nohup npm start > production.log 2>&1 &
    
    echo 'CSS rebuild complete!'
" || echo "Command timed out but may still be running"

echo "✅ CSS rebuild initiated"
