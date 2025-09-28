#!/bin/bash

# WMACS Guardian Setup Script
# Pulls shared CASCADE rules and Guardian system into any workspace

set -e

WMACS_REPO_URL="https://raw.githubusercontent.com/heybearc/jw-attendant-scheduler/feature/api-foundation"
WORKSPACE_NAME=${1:-"default-workspace"}

echo "🛡️ WMACS Guardian: Setting up workspace '$WORKSPACE_NAME'"

# Create WMACS directory structure
echo "📁 Creating WMACS directory structure..."
mkdir -p .wmacs/{tools,config,env-templates,logs,backups}

# Download shared CASCADE rules and tools
echo "📥 Downloading WMACS Guardian system..."
curl -s "$WMACS_REPO_URL/WMACS_SHARED_CASCADE_RULES.md" -o .wmacs/WMACS_SHARED_CASCADE_RULES.md
curl -s "$WMACS_REPO_URL/wmacs-clean-deploy.sh" -o .wmacs/tools/wmacs-clean-deploy.sh
curl -s "$WMACS_REPO_URL/WMACS_SYSTEM_CONFIG.md" -o .wmacs/config/WMACS_SYSTEM_CONFIG.md
curl -s "$WMACS_REPO_URL/WMACS_DEPLOYMENT_ARCHITECTURE.md" -o .wmacs/config/WMACS_DEPLOYMENT_ARCHITECTURE.md

# Make scripts executable
chmod +x .wmacs/tools/wmacs-clean-deploy.sh

# Create workspace-specific configuration
echo "⚙️ Creating workspace configuration..."
cat > .wmacs/config/workspace-config.json << EOF
{
  "workspace_name": "$WORKSPACE_NAME",
  "staging_server": "10.92.3.24",
  "production_server": "10.92.3.22",
  "port": 3001,
  "guardian_enabled": true,
  "clean_deployment": true,
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "2.0.0"
}
EOF

# Create environment templates
echo "🌍 Creating environment templates..."
cat > .wmacs/env-templates/.env.staging << 'EOF'
# WMACS Guardian: Staging Environment Template
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=http://10.92.3.24:3001
DATABASE_URL=postgresql://user_staging:password@10.92.3.21:5432/app_staging
NEXTAUTH_SECRET=staging-secret-change-me
NEXTAUTH_DEBUG=true

# Add your staging-specific variables below:
EOF

cat > .wmacs/env-templates/.env.production << 'EOF'
# WMACS Guardian: Production Environment Template
NODE_ENV=production
PORT=3001
NEXTAUTH_URL=http://10.92.3.22:3001
DATABASE_URL=postgresql://user_prod:password@10.92.3.21:5432/app_production
NEXTAUTH_SECRET=production-secret-ultra-secure-change-me
NEXTAUTH_DEBUG=false

# Add your production-specific variables below:
EOF

# Create Guardian health check script
echo "🏥 Creating health check script..."
cat > .wmacs/tools/wmacs-health-check.sh << 'EOF'
#!/bin/bash
# WMACS Guardian Health Check

WORKSPACE_CONFIG=".wmacs/config/workspace-config.json"

if [ ! -f "$WORKSPACE_CONFIG" ]; then
    echo "❌ WMACS Guardian not properly configured"
    exit 1
fi

STAGING_SERVER=$(jq -r '.staging_server' "$WORKSPACE_CONFIG" 2>/dev/null || echo "10.92.3.24")
PRODUCTION_SERVER=$(jq -r '.production_server' "$WORKSPACE_CONFIG" 2>/dev/null || echo "10.92.3.22")
PORT=$(jq -r '.port' "$WORKSPACE_CONFIG" 2>/dev/null || echo "3001")

echo "🛡️ WMACS Guardian Health Check"
echo "================================"

# Check staging
echo "🧪 Checking staging ($STAGING_SERVER:$PORT)..."
if curl -s -f "http://$STAGING_SERVER:$PORT/health" >/dev/null 2>&1; then
    echo "   ✅ Staging healthy"
else
    echo "   ❌ Staging unhealthy"
fi

# Check production
echo "🚀 Checking production ($PRODUCTION_SERVER:$PORT)..."
if curl -s -f "http://$PRODUCTION_SERVER:$PORT/health" >/dev/null 2>&1; then
    echo "   ✅ Production healthy"
else
    echo "   ❌ Production unhealthy"
fi

echo "================================"
echo "🛡️ Guardian oversight active"
EOF

chmod +x .wmacs/tools/wmacs-health-check.sh

# Update package.json if it exists
if [ -f "package.json" ]; then
    echo "📦 Adding WMACS scripts to package.json..."
    
    # Create backup
    cp package.json package.json.backup
    
    # Add WMACS scripts using jq if available, otherwise manual
    if command -v jq >/dev/null 2>&1; then
        jq '.scripts += {
            "wmacs:deploy:staging": ".wmacs/tools/wmacs-clean-deploy.sh staging",
            "wmacs:deploy:production": ".wmacs/tools/wmacs-clean-deploy.sh production", 
            "wmacs:health": ".wmacs/tools/wmacs-health-check.sh",
            "wmacs:setup": ".wmacs/tools/wmacs-setup.sh"
        }' package.json > package.json.tmp && mv package.json.tmp package.json
    else
        echo "   ⚠️  jq not available - please manually add WMACS scripts to package.json"
    fi
fi

# Create .gitignore entries
echo "🔒 Updating .gitignore..."
cat >> .gitignore << 'EOF'

# WMACS Guardian
.wmacs/logs/
.wmacs/backups/
.wmacs/secrets/
.wmacs/temp/
EOF

# Create README for WMACS
echo "📖 Creating WMACS README..."
cat > .wmacs/README.md << EOF
# WMACS Guardian System

This workspace is protected by the WMACS Guardian system.

## 🛡️ Guardian Rules

See \`WMACS_SHARED_CASCADE_RULES.md\` for complete rules and procedures.

## 🚀 Quick Commands

\`\`\`bash
# Deploy to staging
npm run wmacs:deploy:staging

# Deploy to production  
npm run wmacs:deploy:production

# Health check
npm run wmacs:health
\`\`\`

## 📋 Key Principles

1. **Port 3001 is immutable**
2. **Environment isolation is critical**
3. **Clean deployments only**
4. **Guardian oversight required**

## 🆘 Emergency

If you encounter critical issues, use:
\`\`\`
guardian save me
\`\`\`

---
**WMACS Guardian Version:** 2.0.0  
**Workspace:** $WORKSPACE_NAME  
**Setup Date:** $(date)
EOF

echo ""
echo "🎉 WMACS Guardian setup complete!"
echo ""
echo "📋 What was installed:"
echo "   ✅ Shared CASCADE rules"
echo "   ✅ Clean deployment tools"
echo "   ✅ Environment templates"
echo "   ✅ Health monitoring"
echo "   ✅ Workspace configuration"
echo ""
echo "🚀 Next steps:"
echo "   1. Review .wmacs/WMACS_SHARED_CASCADE_RULES.md"
echo "   2. Customize .wmacs/env-templates/ for your project"
echo "   3. Run: npm run wmacs:health"
echo "   4. Commit WMACS system: git add .wmacs/ && git commit -m 'feat: Add WMACS Guardian'"
echo ""
echo "🛡️ Guardian oversight is now active for workspace '$WORKSPACE_NAME'"
EOF
