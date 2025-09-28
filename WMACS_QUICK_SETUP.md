# APEX Guardian - Quick Setup Guide

## 🚀 **One-Line Setup for Any Workspace**

```bash
curl -s https://raw.githubusercontent.com/heybearc/jw-attendant-scheduler/feature/api-foundation/apex-setup.sh | bash -s "your-workspace-name"
```

## 📋 **What This Does**

1. **Downloads** complete APEX Guardian system
2. **Creates** `.apex/` directory with all tools
3. **Installs** shared CASCADE rules
4. **Sets up** environment templates
5. **Configures** deployment scripts
6. **Adds** health monitoring
7. **Updates** package.json with APEX commands

## 🛡️ **Instant Guardian Protection**

After setup, your workspace will have:

- ✅ **Port 3001 enforcement**
- ✅ **Clean deployment system**
- ✅ **Environment isolation**
- ✅ **Cross-contamination prevention**
- ✅ **Emergency response protocols**

## 🎯 **Usage Examples**

```bash
# Setup APEX in current directory
curl -s https://raw.githubusercontent.com/heybearc/jw-attendant-scheduler/feature/api-foundation/apex-setup.sh | bash -s "my-project"

# Deploy to staging
npm run apex:deploy:staging

# Deploy to production
npm run apex:deploy:production

# Health check
npm run apex:health
```

## 📁 **Directory Structure Created**

```
.apex/
├── APEX_SHARED_CASCADE_RULES.md    # Complete Guardian rules
├── config/
│   ├── workspace-config.json        # Workspace settings
│   ├── APEX_SYSTEM_CONFIG.md       # System standards
│   └── APEX_DEPLOYMENT_ARCHITECTURE.md
├── tools/
│   ├── apex-clean-deploy.sh        # Clean deployment script
│   └── apex-health-check.sh        # Health monitoring
├── env-templates/
│   ├── .env.staging                 # Staging template
│   └── .env.production              # Production template
└── README.md                        # Quick reference
```

## 🔧 **Customization**

After setup, customize:

1. **Environment Templates**: Edit `.apex/env-templates/`
2. **Server IPs**: Update `.apex/config/workspace-config.json`
3. **Deployment Settings**: Modify `.apex/tools/apex-clean-deploy.sh`

## 🆘 **Emergency Support**

If issues arise, the Guardian system provides:
- Immediate diagnostic tools
- Emergency recovery procedures
- Cross-environment contamination detection
- Automated backup and rollback

## 📊 **Compliance Verification**

The system automatically enforces:
- Zero hardcoded environment references
- Clean artifact-based deployments
- Environment-specific configuration injection
- Port 3001 immutability

---

**🛡️ APEX Guardian: Universal protection for all workspaces**
