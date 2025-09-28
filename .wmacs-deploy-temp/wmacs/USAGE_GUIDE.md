# APEX Guardian Usage Guide

**Complete workflow for updating and synchronizing APEX Guardian across all repositories**

## 🚀 **Quick Start Commands**

### **1. Full Update Workflow (Recommended)**
```bash
cd ~/Documents/Cloudy-Work/shared/apex-guardian-system
./update-apex.sh full-update --message "Your update description"
```

### **2. Import New Files from Scripts**
```bash
./update-apex.sh import-from-scripts
```

### **3. Synchronize to All Projects**
```bash
./update-apex.sh sync-to-all
```

### **4. Health Check**
```bash
./update-apex.sh health-check
```

## 📋 **Complete Workflow Steps**

### **Step 1: Develop New APEX Components**
Create your new APEX files in any location:
- `/Users/cory/Documents/Cloudy-Work/scripts/` (recommended for new tools)
- Individual project directories (for project-specific updates)
- Master repository (for direct updates)

**Naming Convention**: All APEX files should start with `apex-`
- `apex-port-guardian.js`
- `apex-architectural-guardian.js`
- `apex-admin-tester.js`
- etc.

### **Step 2: Import to Master Repository**

#### **From Scripts Directory**
```bash
cd ~/Documents/Cloudy-Work/shared/apex-guardian-system
./update-apex.sh import-from-scripts
```

#### **From Specific Project**
```bash
./update-apex.sh import-from-project --project-path /path/to/project
```

### **Step 3: Synchronize to All Projects**
```bash
./update-apex.sh sync-to-all
```

### **Step 4: Version and Commit**
```bash
./update-apex.sh update-version --version v1.3.0 --message "Add new functionality"
```

### **Step 5: Validate System Health**
```bash
./update-apex.sh health-check
```

## 🔄 **Available APEX Components**

After synchronization, each project will have access to:

### **Core Components**
- `apex-guardian.js` - Main deadlock detection and recovery
- `apex-research-advisor.js` - Industry best practices analysis
- `apex-auto-advisor.js` - Real-time suggestion monitoring

### **Extended Components** (New)
- `apex-port-guardian.js` - Port conflict detection and resolution
- `apex-architectural-guardian.js` - Architecture change validation
- `apex-admin-tester.js` - Admin functionality testing
- `apex-admin-comprehensive-tester.js` - Comprehensive admin testing
- `apex-admin-module-tester.js` - Module-specific admin testing
- `apex-uat-guardian.js` - User acceptance testing guardian
- `apex-guardian-global.js` - Global guardian coordination
- `apex-guardian-isolated.js` - Isolated environment guardian

### **Initialization Scripts**
- `apex-universal-init.sh` - Universal APEX setup
- `apex-repo-isolated-init.sh` - Repository isolation setup

## 💻 **Usage in Projects**

### **Basic Commands**
```bash
# In any project directory (jw-attendant-scheduler or ldc-construction-tools)

# Start guardian protection
node apex/apex-guardian.js start [container]

# Analyze suggestions
node apex/apex-research-advisor.js analyze "your suggestion"

# Monitor conversations
node apex/apex-auto-advisor.js monitor "conversation text"

# Test port conflicts
node apex/apex-port-guardian.js check [container]

# Validate architecture changes
node apex/apex-architectural-guardian.js validate "architecture change"

# Run admin tests
node apex/apex-admin-tester.js test [module]
```

### **Project-Specific Configuration**
Each project has a `apex-config.js` file for customization:

```javascript
// apex-config.js (auto-generated, customize as needed)
module.exports = {
  projectName: 'your-project-name',
  projectType: 'nextjs|django|fastapi',
  environments: {
    staging: { container: '135', ip: '10.92.3.25' },
    production: { container: '133', ip: '10.92.3.23' }
  },
  // ... other configurations
};
```

## 🔧 **Advanced Usage**

### **Custom Update Workflows**

#### **Import from Multiple Sources**
```bash
# Import from scripts
./update-apex.sh import-from-scripts

# Import from specific project
./update-apex.sh import-from-project --project-path ~/path/to/project

# Sync to all
./update-apex.sh sync-to-all

# Update version
./update-apex.sh update-version --version v1.4.0
```

#### **Selective Synchronization**
```bash
# Edit sync-apex.sh to customize which files are synchronized
# Add project-specific exclusions or inclusions
```

### **Emergency Updates**
```bash
# Quick sync without version update
./sync-apex.sh

# Force health check
./health-check.sh

# Manual file copy (emergency only)
cp new-apex-file.js ~/Documents/Cloudy-Work/applications/*/apex/
```

## 🏥 **Troubleshooting**

### **Common Issues**

#### **Files Not Synchronizing**
```bash
# Check master repository
ls -la ~/Documents/Cloudy-Work/shared/apex-guardian-system/

# Force re-sync
./update-apex.sh sync-to-all

# Check project directories
ls -la ~/Documents/Cloudy-Work/applications/*/apex/
```

#### **Version Conflicts**
```bash
# Check git status
cd ~/Documents/Cloudy-Work/shared/apex-guardian-system
git status

# Resolve conflicts and retry
git add .
git commit -m "Resolve conflicts"
```

#### **Health Check Failures**
```bash
# Run detailed health check
./health-check.sh

# Check specific project
cd ~/Documents/Cloudy-Work/applications/project-name
node apex/apex-guardian.js diagnose
```

## 📊 **Monitoring and Maintenance**

### **Daily Operations**
```bash
# Morning health check
~/Documents/Cloudy-Work/shared/apex-guardian-system/health-check.sh

# Check for updates
cd ~/Documents/Cloudy-Work/shared/apex-guardian-system
git status
```

### **Weekly Maintenance**
```bash
# Full system update
./update-apex.sh full-update --message "Weekly maintenance update"

# Validate all projects
for project in jw-attendant-scheduler ldc-construction-tools; do
  cd ~/Documents/Cloudy-Work/applications/$project
  node apex/apex-guardian.js test
done
```

### **Version Management**
```bash
# List all versions
cd ~/Documents/Cloudy-Work/shared/apex-guardian-system
git tag -l

# Check current version
git describe --tags

# Rollback to previous version (if needed)
git checkout v1.1.0
./sync-apex.sh
```

## 🎯 **Best Practices**

### **Development Workflow**
1. **Always develop in scripts directory first**
2. **Use descriptive commit messages**
3. **Test in staging before production sync**
4. **Run health checks after updates**
5. **Document new functionality**

### **File Organization**
- Core components: `apex-guardian.js`, `apex-research-advisor.js`
- Specialized tools: `apex-port-guardian.js`, `apex-architectural-guardian.js`
- Testing tools: `apex-*-tester.js`
- Initialization: `apex-*-init.sh`

### **Version Strategy**
- **Patch** (v1.1.1): Bug fixes, minor updates
- **Minor** (v1.2.0): New features, additional tools
- **Major** (v2.0.0): Breaking changes, architecture updates

---

**Last Updated**: 2025-09-19  
**Current Version**: v1.2.0  
**Supported Projects**: JW Attendant Scheduler, LDC Construction Tools
