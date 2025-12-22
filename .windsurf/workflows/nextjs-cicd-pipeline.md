---
description: MCP Blue-Green Deployment Pipeline for Next.js Theocratic Shift Scheduler
---

# MCP Blue-Green Deployment Pipeline - Next.js Implementation

**Environment Mapping:**
- **Blue:** Container 134 (10.92.3.24:3001) - https://blue.theoshift.com
- **Green:** Container 132 (10.92.3.22:3001) - https://green.theoshift.com
- **Database:** Container 131 (10.92.3.21:5432) - Shared PostgreSQL

**Note:** Either Blue or Green can be LIVE or STANDBY. Status is determined by HAProxy routing.

## 🛡️ MCP Deployment Rules (MANDATORY)

### Core Principles
1. **Deploy to STANDBY first** - Always test on STANDBY before switching traffic
2. **Use MCP commands** - All deployments via MCP Blue-Green system
3. **Test before switch** - Validate STANDBY environment before making it LIVE
4. **Automated health checks** - Required before traffic switch

### Prohibited Actions (Auto-Reject)
❌ Direct LIVE deployment
❌ Skipping STANDBY validation
❌ Manual file copying between environments
❌ Bypassing MCP deployment system

## Phase 1: Feature Development

### 1. Check Current Deployment Status
```bash
# Use MCP to check which server is LIVE/STANDBY
mcp3_get_deployment_status(app: "theoshift")
```

### 2. Connect to STANDBY Environment
```bash
# SSH to the STANDBY server (check status first)
ssh jwa  # Blue (10.92.3.24)
# OR
ssh jwg  # Green (10.92.3.22)
```

### 3. Navigate to Project Directory
```bash
cd /opt/theoshift
```

### 4. Development Workflow
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build and test
npm run build
npm run lint

# Restart application
pm2 restart theoshift-blue
# OR
pm2 restart theoshift-green
```

### 5. Test Changes
```bash
# Verify application health
curl https://blue.theoshift.com/api/health
# OR
curl https://green.theoshift.com/api/health
```

## Phase 2: Deployment via MCP

See `/bump`, `/release`, and `/sync` workflows for complete MCP deployment process.

---

**🛡️ MCP Blue-Green Enforcement:** This workflow uses the MCP Blue-Green deployment system.

**Container Mapping:** Blue (134: 10.92.3.24) ⇄ Green (132: 10.92.3.22) → Database (131: 10.92.3.21)
