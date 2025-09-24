---
description: Initial APEX setup for new repositories with deployment standards
---

# APEX Repository Setup Workflow

This workflow sets up APEX deployment standards and synchronization for a new repository.

## Prerequisites
- Repository must be git-initialized
- Access to shared APEX guardian system
- Container infrastructure configured

## Setup Steps

### 1. Initialize APEX Directory Structure
```bash
mkdir -p apex/{config,core,logs}
echo "✅ Created APEX directory structure"
```

### 2. Create Repository Configuration
Create `apex/config/project.json`:
```json
{
  "name": "$(basename $(pwd))",
  "version": "1.0.0",
  "type": "web_application",
  "framework": "nextjs",
  "apex_version": "1.0",
  "deployment_standards": "1.0",
  "mcp_integration": true,
  "repository": {
    "url": "$(git remote get-url origin 2>/dev/null || echo 'unknown')",
    "main_branch": "main",
    "staging_branch": "staging"
  },
  "application": {
    "start_command": "npm run dev",
    "health_endpoint": "/admin",
    "process_pattern": "next"
  }
}
```

### 3. Create Environment Configuration Template
Create `apex/config/environments.json`:
```json
{
  "staging": {
    "container": 134,
    "ip": "10.92.3.24",
    "port": 3001,
    "ssh": "root@10.92.3.24",
    "path": "/opt/PROJECT_NAME",
    "branch": "staging",
    "url": "https://staging.example.com",
    "database_url": "postgresql://user:pass@10.92.3.21:5432/db_staging"
  },
  "production": {
    "container": 132,
    "ip": "10.92.3.22",
    "port": 3000,
    "ssh": "root@10.92.3.22",
    "path": "/opt/PROJECT_NAME",
    "branch": "main",
    "url": "https://production.example.com",
    "database_url": "postgresql://user:pass@10.92.3.21:5432/db_production"
  }
}
```

### 4. Sync APEX Components
// turbo
```bash
node apex/apex-smart-sync.js --include-deployment-standards
```

### 5. Create Deployment Wrapper
Create `deploy.sh`:
```bash
#!/bin/bash
# APEX Deployment Wrapper Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APEX_DEPLOY="$SCRIPT_DIR/apex/core/apex-enhanced-deployment.js"

if [ ! -f "$APEX_DEPLOY" ]; then
    echo "❌ APEX deployment tool not found. Run APEX sync first."
    exit 1
fi

node "$APEX_DEPLOY" "$@"
```

### 6. Make Scripts Executable
// turbo
```bash
chmod +x deploy.sh
chmod +x apex/core/*.js
```

### 7. Update .gitignore
```bash
echo "" >> .gitignore
echo "# APEX logs" >> .gitignore
echo "apex/logs/" >> .gitignore
```

### 8. Test Deployment Setup
```bash
./deploy.sh staging --reason "Initial APEX setup test"
```

## Configuration Required

After running this workflow, you must:

1. **Update `apex/config/environments.json`** with your actual server details
2. **Configure SSH access** to your containers
3. **Test deployment** to staging environment
4. **Validate all endpoints** are working correctly

## Validation Checklist

- [ ] APEX directory structure created
- [ ] Project configuration customized
- [ ] Environment configuration updated with real server details
- [ ] APEX components synced successfully
- [ ] Deployment wrapper script working
- [ ] SSH access to containers configured
- [ ] Test deployment successful
- [ ] All endpoints healthy after deployment

## Next Steps

1. Configure your specific environment details in `environments.json`
2. Test deployment: `./deploy.sh staging --reason "Initial deployment"`
3. Set up regular APEX sync: `/apex-sync` workflow
4. Configure production environment when ready

## Troubleshooting

**If deployment fails:**
1. Check SSH access to containers
2. Verify environment configuration
3. Ensure repository is cloned on target containers
4. Run APEX sync to update deployment tools

**If sync fails:**
1. Verify shared APEX guardian system path
2. Check file permissions
3. Ensure git repository is clean

This workflow establishes the foundation for standardized APEX deployment across all repositories.
