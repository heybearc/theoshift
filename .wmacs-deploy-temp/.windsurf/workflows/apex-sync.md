---
description: APEX Smart Synchronization - Intelligent sync with config preservation
---

# APEX Smart Synchronization Workflow

This workflow synchronizes shared APEX components while preserving repository-specific configurations.

## What Gets Synced

### Shared Components (Always Updated)
- Core APEX guidelines and enforcement mechanisms
- APEX advisors and architectural tools
- **NEW:** Deployment standards and enhanced deployment tools
- **NEW:** MCP integration components
- Cascade rules and operational procedures

### Protected Files (Never Overwritten)
- `apex/config/project.json` - Repository-specific project settings
- `apex/config/environments.json` - Environment-specific configurations
- `apex/logs/` - Deployment and operation logs
- Local customizations and overrides

## Sync Process

### 1. Validate Shared System Access
```bash
echo "🔍 Validating shared APEX guardian system access..."
ls ~/Documents/Cloudy-Work/shared/apex-guardian-system/ || echo "❌ Shared system not found"
```

### 2. Backup Current Configuration
```bash
echo "💾 Backing up current repository-specific configurations..."
cp apex/config/project.json apex/config/project.json.backup 2>/dev/null || true
cp apex/config/environments.json apex/config/environments.json.backup 2>/dev/null || true
```

### 3. Execute Universal Sync (Backward Compatible)
// turbo
```bash
node apex/apex-universal-sync.js
```

### 4. Validate Deployment Tools
```bash
echo "🔧 Validating deployment tools..."
if [ -f "apex/core/apex-enhanced-deployment.js" ]; then
    echo "✅ Enhanced deployment tool available"
    chmod +x apex/core/apex-enhanced-deployment.js
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
# APEX Deployment Wrapper Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APEX_DEPLOY="$SCRIPT_DIR/apex/core/apex-enhanced-deployment.js"

if [ ! -f "$APEX_DEPLOY" ]; then
    echo "❌ APEX deployment tool not found. Run APEX sync first."
    exit 1
fi

node "$APEX_DEPLOY" "$@"
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
if [ -f "apex/config/project.json" ]; then
    echo "✅ Project configuration preserved"
else
    echo "⚠️ Project configuration missing - may need manual setup"
fi

if [ -f "apex/config/environments.json" ]; then
    echo "✅ Environment configuration preserved"
else
    echo "⚠️ Environment configuration missing - may need manual setup"
fi
```

### 7. Test Deployment Readiness
```bash
echo "🧪 Testing deployment readiness..."
if [ -f "apex/core/apex-enhanced-deployment.js" ] && [ -f "apex/config/environments.json" ]; then
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
- ✅ Current APEX enforcement mechanisms
- ✅ Latest cascade rules and operational procedures

### Manual Actions Required
- 🔧 **Review environment configuration** if any new fields were added
- 🔧 **Test deployment** to ensure everything works correctly
- 🔧 **Update team** on any new deployment procedures

## Sync Categories

### Core APEX (Always Synced)
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
1. Check shared system path: `~/Documents/Cloudy-Work/shared/apex-guardian-system/`
2. Verify file permissions
3. Ensure git repository is clean
4. Check for file conflicts

**If deployment tools missing:**
1. Re-run sync with: `node apex/apex-smart-sync.js --force`
2. Check shared system has latest deployment standards
3. Verify file permissions on synced files

**If configuration lost:**
1. Restore from backup: `cp apex/config/*.backup apex/config/`
2. Re-run sync to get latest shared components
3. Manually recreate configuration if needed

## Integration with Development Workflow

This sync should be run:
- **Weekly** - To get latest APEX improvements
- **Before major deployments** - To ensure latest deployment tools
- **After shared system updates** - When notified of APEX updates
- **When deployment issues occur** - To get latest fixes

The sync preserves your repository-specific settings while keeping you current with the latest APEX capabilities and deployment standards.
