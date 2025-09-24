#!/bin/bash

# WMACS Deployment Standards Setup Script
# Implements standardized deployment protocols for any repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WMACS_DIR="${REPO_ROOT}/wmacs"

echo "🛡️ WMACS Deployment Standards Setup"
echo "===================================="
echo "Repository: $(basename "$REPO_ROOT")"
echo "WMACS Directory: $WMACS_DIR"
echo ""

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo "✅ Created directory: $1"
    else
        echo "📁 Directory exists: $1"
    fi
}

# Function to copy file if it doesn't exist or is different
copy_file() {
    local src="$1"
    local dest="$2"
    local force="${3:-false}"
    
    if [ ! -f "$dest" ] || [ "$force" = "true" ]; then
        cp "$src" "$dest"
        echo "✅ Copied: $(basename "$dest")"
    else
        # Check if files are different
        if ! cmp -s "$src" "$dest"; then
            echo "⚠️  File differs: $(basename "$dest")"
            read -p "   Overwrite? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp "$src" "$dest"
                echo "✅ Updated: $(basename "$dest")"
            else
                echo "⏭️  Skipped: $(basename "$dest")"
            fi
        else
            echo "📄 File up-to-date: $(basename "$dest")"
        fi
    fi
}

# Create WMACS directory structure
echo "📁 Setting up WMACS directory structure..."
create_dir "$WMACS_DIR"
create_dir "$WMACS_DIR/config"
create_dir "$WMACS_DIR/core"
create_dir "$WMACS_DIR/logs"

# Copy core WMACS files
echo ""
echo "📋 Installing WMACS deployment standards..."

# Core deployment files
copy_file "$SCRIPT_DIR/core/DEPLOYMENT_STANDARDS.md" "$WMACS_DIR/core/DEPLOYMENT_STANDARDS.md"
copy_file "$SCRIPT_DIR/core/wmacs-enhanced-deployment.js" "$WMACS_DIR/core/wmacs-enhanced-deployment.js"
copy_file "$SCRIPT_DIR/core/wmacs-deployment-rules.json" "$WMACS_DIR/core/wmacs-deployment-rules.json"

# Make deployment script executable
chmod +x "$WMACS_DIR/core/wmacs-enhanced-deployment.js"

# Create project configuration if it doesn't exist
PROJECT_CONFIG="$WMACS_DIR/config/project.json"
if [ ! -f "$PROJECT_CONFIG" ]; then
    echo ""
    echo "📝 Creating project configuration..."
    
    # Get project name from directory or git remote
    PROJECT_NAME=$(basename "$REPO_ROOT")
    if git remote get-url origin >/dev/null 2>&1; then
        GIT_URL=$(git remote get-url origin)
        PROJECT_NAME=$(basename "$GIT_URL" .git)
    fi
    
    cat > "$PROJECT_CONFIG" << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "type": "web_application",
  "framework": "nextjs",
  "wmacs_version": "1.0",
  "deployment_standards": "1.0",
  "mcp_integration": true,
  "repository": {
    "url": "$(git remote get-url origin 2>/dev/null || 'unknown')",
    "main_branch": "main",
    "staging_branch": "staging"
  },
  "application": {
    "start_command": "npm run dev",
    "health_endpoint": "/admin",
    "process_pattern": "next"
  }
}
EOF
    echo "✅ Created: project.json"
else
    echo "📄 Project configuration exists: project.json"
fi

# Create environments configuration template if it doesn't exist
ENV_CONFIG="$WMACS_DIR/config/environments.json"
if [ ! -f "$ENV_CONFIG" ]; then
    echo ""
    echo "📝 Creating environments configuration template..."
    
    cat > "$ENV_CONFIG" << EOF
{
  "staging": {
    "container": 134,
    "ip": "10.92.3.24",
    "port": 3001,
    "ssh": "root@10.92.3.24",
    "path": "/opt/$PROJECT_NAME",
    "branch": "staging",
    "url": "https://staging.example.com",
    "database_url": "postgresql://user:pass@10.92.3.21:5432/db_staging"
  },
  "production": {
    "container": 132,
    "ip": "10.92.3.22",
    "port": 3000,
    "ssh": "root@10.92.3.22",
    "path": "/opt/$PROJECT_NAME",
    "branch": "main",
    "url": "https://production.example.com",
    "database_url": "postgresql://user:pass@10.92.3.21:5432/db_production"
  }
}
EOF
    echo "✅ Created: environments.json (TEMPLATE - PLEASE CONFIGURE)"
    echo "⚠️  IMPORTANT: Update environments.json with your actual server details"
else
    echo "📄 Environment configuration exists: environments.json"
fi

# Create deployment wrapper script
DEPLOY_SCRIPT="$REPO_ROOT/deploy.sh"
if [ ! -f "$DEPLOY_SCRIPT" ]; then
    cat > "$DEPLOY_SCRIPT" << 'EOF'
#!/bin/bash
# WMACS Deployment Wrapper Script
# Usage: ./deploy.sh <environment> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WMACS_DEPLOY="$SCRIPT_DIR/wmacs/core/wmacs-enhanced-deployment.js"

if [ ! -f "$WMACS_DEPLOY" ]; then
    echo "❌ WMACS deployment tool not found. Run wmacs/setup-wmacs-deployment-standards.sh first."
    exit 1
fi

node "$WMACS_DEPLOY" "$@"
EOF
    chmod +x "$DEPLOY_SCRIPT"
    echo "✅ Created: deploy.sh wrapper script"
else
    echo "📄 Deployment wrapper exists: deploy.sh"
fi

# Create .gitignore entries for WMACS logs
GITIGNORE="$REPO_ROOT/.gitignore"
if [ -f "$GITIGNORE" ]; then
    if ! grep -q "wmacs/logs/" "$GITIGNORE"; then
        echo "" >> "$GITIGNORE"
        echo "# WMACS logs" >> "$GITIGNORE"
        echo "wmacs/logs/" >> "$GITIGNORE"
        echo "✅ Added WMACS logs to .gitignore"
    else
        echo "📄 WMACS logs already in .gitignore"
    fi
fi

echo ""
echo "🎉 WMACS Deployment Standards Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure wmacs/config/environments.json with your server details"
echo "2. Test deployment: ./deploy.sh staging --reason 'Initial WMACS deployment'"
echo "3. Verify all endpoints are working correctly"
echo ""
echo "📚 Documentation:"
echo "- Deployment Standards: wmacs/core/DEPLOYMENT_STANDARDS.md"
echo "- Deployment Rules: wmacs/core/wmacs-deployment-rules.json"
echo ""
echo "🛡️ WMACS Guardian: Standardized deployment protocols active"
