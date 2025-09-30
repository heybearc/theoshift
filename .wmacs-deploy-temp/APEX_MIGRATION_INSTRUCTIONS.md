# APEX Migration Instructions
**Complete guide to migrate any repository from WMACS to APEX**

## 🎯 **OVERVIEW**
This guide will migrate your repository from WMACS to the new APEX Guardian System, providing:
- 76% less typing (apex vs wmacs guardian mcp)
- Automatic activation via persistent memory
- Enhanced deployment standards
- Professional branding and naming

## 📋 **PREREQUISITES**
- Repository with existing WMACS system OR new repository
- Access to source APEX repository for copying files
- Git repository (recommended for safety)

## 🚀 **STEP 1: COPY APEX UNIVERSAL SYNC**

### Copy the universal sync tool from the source repository:
```bash
# Replace SOURCE_REPO_PATH with actual path to your APEX-enabled repository
SOURCE_REPO_PATH="/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler"

# Copy universal sync to current repository
cp "$SOURCE_REPO_PATH/apex/apex-universal-sync.js" ./
chmod +x apex-universal-sync.js

echo "✅ Copied APEX Universal Sync tool"
```

## 🔄 **STEP 2: RUN APEX MIGRATION**

### Execute the universal sync (handles all repository types automatically):
```bash
# This will auto-detect your repository type and perform appropriate migration
node apex-universal-sync.js
```

### Expected outputs based on repository type:

#### **For WMACS Repository:**
```
🔄 WMACS repository detected - will migrate to APEX
⚠️  Using legacy WMACS guardian system
🛡️ APEX Universal Sync: Starting backward-compatible synchronization...
📋 Repository Type: WMACS
📋 Shared System: WMACS
🔄 Migrating WMACS repository to APEX...
✅ Copied WMACS directory to APEX
🔄 Renaming WMACS files to APEX...
   Renamed: wmacs-guardian.js → apex-guardian.js
   Renamed: wmacs-smart-sync.js → apex-smart-sync.js
✅ WMACS to APEX migration completed
📋 Note: Original wmacs/ directory preserved for safety
```

#### **For New Repository:**
```
📦 New repository - will initialize APEX structure
📁 Creating APEX directory structure...
✅ APEX directory structure created
```

#### **For Existing APEX Repository:**
```
🚀 APEX repository detected
✅ Using APEX guardian system
```

## 📁 **STEP 3: COPY APEX WORKFLOWS**

### Copy the APEX workflow files:
```bash
# Create workflows directory if it doesn't exist
mkdir -p .windsurf/workflows/

# Copy APEX workflows
cp "$SOURCE_REPO_PATH/.windsurf/workflows/apex-setup.md" .windsurf/workflows/
cp "$SOURCE_REPO_PATH/.windsurf/workflows/apex-sync.md" .windsurf/workflows/

echo "✅ Copied APEX workflows"
```

## 🚀 **STEP 4: CREATE DEPLOYMENT WRAPPER**

### Copy the deployment wrapper script:
```bash
# Copy deployment wrapper
cp "$SOURCE_REPO_PATH/deploy.sh" ./
chmod +x deploy.sh

echo "✅ Created APEX deployment wrapper"
```

## 🔧 **STEP 5: CONFIGURE ENVIRONMENT (If New Repository)**

### If this is a new repository, create environment configuration:
```bash
# Only run this if apex/config/environments.json doesn't exist
if [ ! -f "apex/config/environments.json" ]; then
    cat > apex/config/environments.json << 'EOF'
{
  "staging": {
    "container": 134,
    "ip": "10.92.3.24",
    "port": 3001,
    "url": "https://your-staging-url.com"
  },
  "production": {
    "container": 132,
    "ip": "10.92.3.22",
    "port": 3001,
    "url": "https://your-production-url.com"
  },
  "database": {
    "container": 131,
    "ip": "10.92.3.21",
    "port": 5432,
    "name": "your_database_name"
  }
}
EOF
    echo "✅ Created environment configuration template"
    echo "⚠️  Please update apex/config/environments.json with your actual environment details"
fi
```

## 🧪 **STEP 6: TEST APEX FUNCTIONALITY**

### Test the APEX deployment system:
```bash
# Test deployment (replace 'staging' with your target environment)
./deploy.sh staging --reason "APEX migration test"
```

### Test APEX sync (should work for future updates):
```bash
# Test ongoing sync functionality
node apex/apex-universal-sync.js
```

## ✅ **STEP 7: VALIDATION CHECKLIST**

### Verify migration success:
```bash
echo "🔍 APEX Migration Validation:"
echo ""

# Check APEX directory structure
if [ -d "apex" ]; then
    echo "✅ APEX directory exists"
else
    echo "❌ APEX directory missing"
fi

# Check key APEX files
if [ -f "apex/apex-enhanced-deployment.js" ]; then
    echo "✅ APEX deployment tool available"
else
    echo "❌ APEX deployment tool missing"
fi

# Check deployment wrapper
if [ -f "deploy.sh" ]; then
    echo "✅ Deployment wrapper available"
else
    echo "❌ Deployment wrapper missing"
fi

# Check workflows
if [ -f ".windsurf/workflows/apex-sync.md" ]; then
    echo "✅ APEX workflows available"
else
    echo "❌ APEX workflows missing"
fi

# Check configuration
if [ -f "apex/config/project.json" ]; then
    echo "✅ APEX configuration exists"
else
    echo "❌ APEX configuration missing"
fi

echo ""
echo "🎉 APEX Migration Validation Complete"
```

## 🛡️ **STEP 8: CREATE APEX AUTO-ACTIVATION MEMORY**

### In your Windsurf workspace, create the auto-activation memory:

**Ask Windsurf to create this memory:**
```
Please create a memory for APEX Guardian auto-activation with the following content:

APEX GUARDIAN SYSTEM AUTO-ACTIVATION:

MANDATORY APPLICATION RULES:
- Auto-apply APEX Guardian to ALL interactions in APEX-enabled repositories
- Enforce MCP operations for ALL server/deployment tasks (no manual SSH)
- Apply deployment standards automatically without manual prompting
- Use enhanced deployment tools by default
- Enforce cascade rules and operational procedures
- Mandatory repository verification for all deployments

REPOSITORY DETECTION:
- Repository: [YOUR_REPO_NAME] (APEX-enabled)
- Contains: apex/ directory with full APEX configuration
- MCP servers: Available and mandatory for operations
- Deployment standards: v1.0 enforced

ACTIVATION TRIGGERS:
- ANY deployment task → Use APEX MCP deployment tools
- ANY server operation → Use APEX MCP operations
- ANY repository sync → Use APEX smart sync
- ANY development task → Apply APEX cascade rules

SHORTENED COMMANDS:
- "apex" → Full APEX Guardian activation
- "apex deploy" → APEX deployment operations
- "apex mcp" → APEX MCP operations focus

This memory ensures APEX Guardian is applied consistently to every interaction without manual prompting, optimizing credit usage and ensuring proper MCP operation usage.
```

## 🎯 **STEP 9: COMMIT CHANGES (RECOMMENDED)**

### Commit the APEX migration:
```bash
# Add all APEX files
git add .

# Commit migration
git commit -m "feat: Migrate to APEX Guardian System

🚀 APEX GUARDIAN MIGRATION COMPLETE:
- Migrated from WMACS to APEX (Automated Project Excellence)
- Added APEX universal sync for backward compatibility
- Implemented enhanced deployment standards
- Created APEX workflows for setup and ongoing sync

📋 APEX COMPONENTS ADDED:
- apex/ directory with full APEX structure
- APEX deployment tools with repository verification
- APEX workflows: /apex-setup and /apex-sync
- Deployment wrapper script for streamlined operations

✅ BENEFITS:
- 76% typing reduction (apex vs wmacs guardian mcp)
- Automatic MCP operation enforcement
- Consistent deployment standards application
- Professional branding for organization-wide adoption

APEX Guardian: Peak Performance Through Intelligent Automation ✅"

echo "✅ APEX migration committed to git"
```

## 🎉 **MIGRATION COMPLETE!**

### Your repository now has:
- ✅ **APEX Guardian System** with auto-activation
- ✅ **Enhanced deployment tools** with repository verification
- ✅ **Professional workflows** (/apex-setup, /apex-sync)
- ✅ **Backward compatibility** with existing WMACS systems
- ✅ **Streamlined commands** (76% less typing)

### Going forward, use:
- **`apex`** - For explicit APEX activation (auto-activates anyway)
- **`./deploy.sh staging`** - For deployments
- **`/apex-sync`** - For ongoing synchronization
- **`node apex/apex-universal-sync.js`** - For manual sync

## 🔧 **TROUBLESHOOTING**

### If migration fails:
1. **Check source path:** Ensure SOURCE_REPO_PATH is correct
2. **Verify permissions:** Ensure files are executable
3. **Check shared system:** Verify shared APEX system exists
4. **Review logs:** Check output for specific error messages

### If deployment fails:
1. **Update environments.json:** Ensure correct container IPs/ports
2. **Check MCP server:** Verify MCP operations are available
3. **Validate configuration:** Ensure apex/config/project.json is correct

### For help:
- **Check workflows:** Use `/apex-setup` or `/apex-sync` workflows
- **Review documentation:** Check APEX_BACKWARD_COMPATIBILITY.md
- **Test components:** Run individual APEX tools to isolate issues

**APEX Guardian: Peak Performance Through Intelligent Automation** 🛡️✨
