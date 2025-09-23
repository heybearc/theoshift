# WMACS Guardian Usage Guide

**Complete workflow for updating and synchronizing WMACS Guardian across all repositories**

## 🚀 **Quick Start Commands**

### **1. Full Update Workflow (Recommended)**
```bash
cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
./update-wmacs.sh full-update --message "Your update description"
```

### **2. Import New Files from Scripts**
```bash
./update-wmacs.sh import-from-scripts
```

### **3. Synchronize to All Projects**
```bash
./update-wmacs.sh sync-to-all
```

### **4. Health Check**
```bash
./update-wmacs.sh health-check
```

## 📋 **Complete Workflow Steps**

### **Step 1: Develop New WMACS Components**
Create your new WMACS files in any location:
- `/Users/cory/Documents/Cloudy-Work/scripts/` (recommended for new tools)
- Individual project directories (for project-specific updates)
- Master repository (for direct updates)

**Naming Convention**: All WMACS files should start with `wmacs-`
- `wmacs-port-guardian.js`
- `wmacs-architectural-guardian.js`
- `wmacs-admin-tester.js`
- etc.

### **Step 2: Import to Master Repository**

#### **From Scripts Directory**
```bash
cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
./update-wmacs.sh import-from-scripts
```

#### **From Specific Project**
```bash
./update-wmacs.sh import-from-project --project-path /path/to/project
```

### **Step 3: Synchronize to All Projects**
```bash
./update-wmacs.sh sync-to-all
```

### **Step 4: Version and Commit**
```bash
./update-wmacs.sh update-version --version v1.3.0 --message "Add new functionality"
```

### **Step 5: Validate System Health**
```bash
./update-wmacs.sh health-check
```

## 🔄 **Available WMACS Components**

After synchronization, each project will have access to:

### **Core Components**
- `wmacs-guardian.js` - Main deadlock detection and recovery
- `wmacs-research-advisor.js` - Industry best practices analysis
- `wmacs-auto-advisor.js` - Real-time suggestion monitoring

### **Extended Components** (New)
- `wmacs-port-guardian.js` - Port conflict detection and resolution
- `wmacs-architectural-guardian.js` - Architecture change validation
- `wmacs-admin-tester.js` - Admin functionality testing
- `wmacs-admin-comprehensive-tester.js` - Comprehensive admin testing
- `wmacs-admin-module-tester.js` - Module-specific admin testing
- `wmacs-uat-guardian.js` - User acceptance testing guardian
- `wmacs-guardian-global.js` - Global guardian coordination
- `wmacs-guardian-isolated.js` - Isolated environment guardian

### **Initialization Scripts**
- `wmacs-universal-init.sh` - Universal WMACS setup
- `wmacs-repo-isolated-init.sh` - Repository isolation setup

## 💻 **Usage in Projects**

### **Basic Commands**
```bash
# In any project directory (jw-attendant-scheduler or ldc-construction-tools)

# Start guardian protection
node wmacs/wmacs-guardian.js start [container]

# Analyze suggestions
node wmacs/wmacs-research-advisor.js analyze "your suggestion"

# Monitor conversations
node wmacs/wmacs-auto-advisor.js monitor "conversation text"

# Test port conflicts
node wmacs/wmacs-port-guardian.js check [container]

# Validate architecture changes
node wmacs/wmacs-architectural-guardian.js validate "architecture change"

# Run admin tests
node wmacs/wmacs-admin-tester.js test [module]
```

### **Project-Specific Configuration**
Each project has a `wmacs-config.js` file for customization:

```javascript
// wmacs-config.js (auto-generated, customize as needed)
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
./update-wmacs.sh import-from-scripts

# Import from specific project
./update-wmacs.sh import-from-project --project-path ~/path/to/project

# Sync to all
./update-wmacs.sh sync-to-all

# Update version
./update-wmacs.sh update-version --version v1.4.0
```

#### **Selective Synchronization**
```bash
# Edit sync-wmacs.sh to customize which files are synchronized
# Add project-specific exclusions or inclusions
```

### **Emergency Updates**
```bash
# Quick sync without version update
./sync-wmacs.sh

# Force health check
./health-check.sh

# Manual file copy (emergency only)
cp new-wmacs-file.js ~/Documents/Cloudy-Work/applications/*/wmacs/
```

## 🏥 **Troubleshooting**

### **Common Issues**

#### **Files Not Synchronizing**
```bash
# Check master repository
ls -la ~/Documents/Cloudy-Work/shared/wmacs-guardian-system/

# Force re-sync
./update-wmacs.sh sync-to-all

# Check project directories
ls -la ~/Documents/Cloudy-Work/applications/*/wmacs/
```

#### **Version Conflicts**
```bash
# Check git status
cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
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
node wmacs/wmacs-guardian.js diagnose
```

## 📊 **Monitoring and Maintenance**

### **Daily Operations**
```bash
# Morning health check
~/Documents/Cloudy-Work/shared/wmacs-guardian-system/health-check.sh

# Check for updates
cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
git status
```

### **Weekly Maintenance**
```bash
# Full system update
./update-wmacs.sh full-update --message "Weekly maintenance update"

# Validate all projects
for project in jw-attendant-scheduler ldc-construction-tools; do
  cd ~/Documents/Cloudy-Work/applications/$project
  node wmacs/wmacs-guardian.js test
done
```

### **Version Management**
```bash
# List all versions
cd ~/Documents/Cloudy-Work/shared/wmacs-guardian-system
git tag -l

# Check current version
git describe --tags

# Rollback to previous version (if needed)
git checkout v1.1.0
./sync-wmacs.sh
```

## 🎯 **Best Practices**

### **Development Workflow**
1. **Always develop in scripts directory first**
2. **Use descriptive commit messages**
3. **Test in staging before production sync**
4. **Run health checks after updates**
5. **Document new functionality**

### **File Organization**
- Core components: `wmacs-guardian.js`, `wmacs-research-advisor.js`
- Specialized tools: `wmacs-port-guardian.js`, `wmacs-architectural-guardian.js`
- Testing tools: `wmacs-*-tester.js`
- Initialization: `wmacs-*-init.sh`

### **Version Strategy**
- **Patch** (v1.1.1): Bug fixes, minor updates
- **Minor** (v1.2.0): New features, additional tools
- **Major** (v2.0.0): Breaking changes, architecture updates

---

**Last Updated**: 2025-09-19  
**Current Version**: v1.2.0  
**Supported Projects**: JW Attendant Scheduler, LDC Construction Tools
