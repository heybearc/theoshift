#!/bin/bash

# WMACS Repository-Isolated Initialization Script
# Creates completely self-contained WMACS framework within each repository
# NO global dependencies or shared state - prevents conflicts between repositories

set -e

echo "🚨 WMACS GUARDIAN: REPOSITORY-ISOLATED INITIALIZATION"
echo "====================================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository. Please run this script from your project root."
    exit 1
fi

PROJECT_ROOT=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_ROOT")

echo "📁 Project: $PROJECT_NAME"
echo "📍 Location: $PROJECT_ROOT"
echo "🔒 Mode: Repository-Isolated (No global dependencies)"

# Create WMACS directory structure
echo "🏗️ Creating WMACS directory structure..."
mkdir -p .wmacs/{scripts,config,logs,state,ssh-keys}

# Detect project type
echo "🔍 Detecting project type..."
PROJECT_TYPE="unknown"
BUILD_CMD="echo 'No build command'"
START_CMD="echo 'No start command'"
DEFAULT_PORT=3000

if [ -f "package.json" ]; then
    if grep -q "next" package.json; then
        PROJECT_TYPE="nextjs"
        BUILD_CMD="npm run build"
        START_CMD="npm start"
        DEFAULT_PORT=3001
    elif grep -q "react" package.json; then
        PROJECT_TYPE="react"
        BUILD_CMD="npm run build"
        START_CMD="npm start"
        DEFAULT_PORT=3000
    else
        PROJECT_TYPE="node"
        BUILD_CMD="npm install"
        START_CMD="npm start"
        DEFAULT_PORT=3000
    fi
elif [ -f "requirements.txt" ]; then
    PROJECT_TYPE="python"
    BUILD_CMD="pip install -r requirements.txt"
    START_CMD="python app.py"
    DEFAULT_PORT=8000
fi

echo "✅ Detected: $PROJECT_TYPE"

# Create repository-specific configuration
cat > .wmacs/config/wmacs-config.json << EOF
{
  "project": {
    "name": "$PROJECT_NAME",
    "type": "$PROJECT_TYPE",
    "buildCommand": "$BUILD_CMD",
    "startCommand": "$START_CMD",
    "port": $DEFAULT_PORT
  },
  "environments": {
    "staging": {
      "host": "STAGING_HOST_IP",
      "port": $DEFAULT_PORT,
      "user": "deploy-user",
      "path": "/opt/$PROJECT_NAME/current"
    },
    "production": {
      "host": "PRODUCTION_HOST_IP",
      "port": $DEFAULT_PORT,
      "user": "deploy-user", 
      "path": "/opt/$PROJECT_NAME/current"
    }
  },
  "guardian": {
    "repositoryIsolated": true,
    "timeouts": { "ssh": 30, "build": 300, "deploy": 120 },
    "retries": { "maxAttempts": 3, "backoffMs": 5000 }
  }
}
EOF

# Create SSH config template
cat > .wmacs/config/ssh_config << EOF
Host staging
    HostName STAGING_HOST_IP
    User deploy-user
    IdentityFile .wmacs/ssh-keys/id_rsa
    ConnectTimeout 10

Host production
    HostName PRODUCTION_HOST_IP
    User deploy-user
    IdentityFile .wmacs/ssh-keys/id_rsa
    ConnectTimeout 10
EOF

echo "✅ Repository-isolated WMACS structure created"
echo "📝 Next: Update .wmacs/config/wmacs-config.json with your environment IPs"
echo "🔑 Next: Add SSH keys to .wmacs/ssh-keys/"
