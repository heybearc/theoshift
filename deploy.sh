#!/bin/bash
# APEX Deployment Wrapper Script
# Usage: ./deploy.sh <environment> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APEX_DEPLOY="$SCRIPT_DIR/apex/core/apex-enhanced-deployment.js"

if [ ! -f "$APEX_DEPLOY" ]; then
    echo "❌ APEX deployment tool not found. Run APEX sync first."
    exit 1
fi

node "$APEX_DEPLOY" "$@"
