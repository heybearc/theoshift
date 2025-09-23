# WMACS Guardian - Quick Setup Guide

## 🚀 **One-Line Setup for Any Workspace**

```bash
curl -s https://raw.githubusercontent.com/heybearc/jw-attendant-scheduler/feature/api-foundation/wmacs-setup.sh | bash -s "your-workspace-name"
```

## 📋 **What This Does**

1. **Downloads** complete WMACS Guardian system
2. **Creates** `.wmacs/` directory with all tools
3. **Installs** shared CASCADE rules
4. **Sets up** environment templates
5. **Configures** deployment scripts
6. **Adds** health monitoring
7. **Updates** package.json with WMACS commands

## 🛡️ **Instant Guardian Protection**

After setup, your workspace will have:

- ✅ **Port 3001 enforcement**
- ✅ **Clean deployment system**
- ✅ **Environment isolation**
- ✅ **Cross-contamination prevention**
- ✅ **Emergency response protocols**

## 🎯 **Usage Examples**

```bash
# Setup WMACS in current directory
curl -s https://raw.githubusercontent.com/heybearc/jw-attendant-scheduler/feature/api-foundation/wmacs-setup.sh | bash -s "my-project"

# Deploy to staging
npm run wmacs:deploy:staging

# Deploy to production
npm run wmacs:deploy:production

# Health check
npm run wmacs:health
```

## 📁 **Directory Structure Created**

```
.wmacs/
├── WMACS_SHARED_CASCADE_RULES.md    # Complete Guardian rules
├── config/
│   ├── workspace-config.json        # Workspace settings
│   ├── WMACS_SYSTEM_CONFIG.md       # System standards
│   └── WMACS_DEPLOYMENT_ARCHITECTURE.md
├── tools/
│   ├── wmacs-clean-deploy.sh        # Clean deployment script
│   └── wmacs-health-check.sh        # Health monitoring
├── env-templates/
│   ├── .env.staging                 # Staging template
│   └── .env.production              # Production template
└── README.md                        # Quick reference
```

## 🔧 **Customization**

After setup, customize:

1. **Environment Templates**: Edit `.wmacs/env-templates/`
2. **Server IPs**: Update `.wmacs/config/workspace-config.json`
3. **Deployment Settings**: Modify `.wmacs/tools/wmacs-clean-deploy.sh`

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

**🛡️ WMACS Guardian: Universal protection for all workspaces**
