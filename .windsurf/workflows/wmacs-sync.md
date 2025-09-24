---
description: WMACS Smart Synchronization - Intelligent sync with config preservation
---

# WMACS Smart Synchronization Workflow

This workflow synchronizes shared WMACS components while preserving repository-specific configurations.

## What Gets Synced

### Shared Components (Always Updated)
- Core WMACS guidelines and enforcement mechanisms
- WMACS advisors and architectural tools
- **NEW:** Deployment standards and enhanced deployment tools
- **NEW:** MCP integration components
- Cascade rules and operational procedures

### Protected Files (Never Overwritten)
- `wmacs/config/project.json` - Repository-specific project settings
- `wmacs/config/environments.json` - Environment-specific configurations
- `wmacs/logs/` - Deployment and operation logs
- Local customizations and overrides

## Sync Process

### 1. Validate Shared System Access
```bash
echo "🔍 Validating shared WMACS guardian system access..."
ls ~/Documents/Cloudy-Work/shared/wmacs-guardian-system/ || echo "❌ Shared system not found"
```

### 2. Backup Current Configuration
```bash
echo "💾 Backing up current repository-specific configurations..."
cp wmacs/config/project.json wmacs/config/project.json.backup 2>/dev/null || true
cp wmacs/config/environments.json wmacs/config/environments.json.backup 2>/dev/null || true
```

### 3. Execute Smart Sync
// turbo
```bash
node wmacs/wmacs-smart-sync.js
```

### 4. Validate Deployment Tools
```bash
echo "🔧 Validating deployment tools..."
if [ -f "wmacs/core/wmacs-enhanced-deployment.js" ]; then
    echo "✅ Enhanced deployment tool available"
    chmod +x wmacs/core/wmacs-enhanced-deployment.js
else
    echo "⚠️ Enhanced deployment tool not found"
fi
```

### 5. Update Deployment Wrapper
```bash
echo "📝 Ensuring deployment wrapper is current..."
if [ ! -f "deploy.sh" ]; then
    cat > deploy.sh << 'EOF'
#!/bin/bash
# WMACS Deployment Wrapper Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WMACS_DEPLOY="$SCRIPT_DIR/wmacs/core/wmacs-enhanced-deployment.js"

if [ ! -f "$WMACS_DEPLOY" ]; then
    echo "❌ WMACS deployment tool not found. Run WMACS sync first."
    exit 1
fi

node "$WMACS_DEPLOY" "$@"
EOF
    chmod +x deploy.sh
    echo "✅ Created deployment wrapper"
else
    echo "📄 Deployment wrapper exists"
fi
```

### 6. Validate Configuration Integrity
```bash
echo "🔍 Validating configuration integrity..."
if [ -f "wmacs/config/project.json" ]; then
    echo "✅ Project configuration preserved"
else
    echo "⚠️ Project configuration missing - may need manual setup"
fi

if [ -f "wmacs/config/environments.json" ]; then
    echo "✅ Environment configuration preserved"
else
    echo "⚠️ Environment configuration missing - may need manual setup"
fi
```

### 7. Test Deployment Readiness
```bash
echo "🧪 Testing deployment readiness..."
if [ -f "wmacs/core/wmacs-enhanced-deployment.js" ] && [ -f "wmacs/config/environments.json" ]; then
    echo "✅ Repository ready for enhanced deployment"
    echo "📋 Test with: ./deploy.sh staging --reason 'Post-sync validation'"
else
    echo "⚠️ Repository not ready for deployment - check configuration"
fi
```

## Post-Sync Actions

### Automatic Updates Applied
- ✅ Latest deployment standards documentation
- ✅ Enhanced deployment tools with repository verification
- ✅ Updated MCP integration components
- ✅ Current WMACS enforcement mechanisms
- ✅ Latest cascade rules and operational procedures

### Manual Actions Required
- 🔧 **Review environment configuration** if any new fields were added
- 🔧 **Test deployment** to ensure everything works correctly
- 🔧 **Update team** on any new deployment procedures

## Sync Categories

### Core WMACS (Always Synced)
- Operational guidelines and enforcement mechanisms
- Usage guides and procedures
- Cascade rules and health checks

### Deployment Standards (Always Synced)
- Enhanced deployment tools
- Deployment rules and validation
- MCP integration components

### Repository-Specific (Never Synced)
- Project configuration
- Environment settings
- Deployment logs
- Local customizations

## Validation Checklist

After sync completion:

- [ ] Shared components updated successfully
- [ ] Repository-specific configs preserved
- [ ] Deployment tools available and executable
- [ ] Environment configuration intact
- [ ] Deployment wrapper script working
- [ ] No configuration conflicts detected

## Troubleshooting

**If sync fails:**
1. Check shared system path: `~/Documents/Cloudy-Work/shared/wmacs-guardian-system/`
2. Verify file permissions
3. Ensure git repository is clean
4. Check for file conflicts

**If deployment tools missing:**
1. Re-run sync with: `node wmacs/wmacs-smart-sync.js --force`
2. Check shared system has latest deployment standards
3. Verify file permissions on synced files

**If configuration lost:**
1. Restore from backup: `cp wmacs/config/*.backup wmacs/config/`
2. Re-run sync to get latest shared components
3. Manually recreate configuration if needed

## Integration with Development Workflow

This sync should be run:
- **Weekly** - To get latest WMACS improvements
- **Before major deployments** - To ensure latest deployment tools
- **After shared system updates** - When notified of WMACS updates
- **When deployment issues occur** - To get latest fixes

The sync preserves your repository-specific settings while keeping you current with the latest WMACS capabilities and deployment standards.
