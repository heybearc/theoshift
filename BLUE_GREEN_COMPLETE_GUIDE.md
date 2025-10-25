# Blue-Green Deployment - Complete Guide
**JW Attendant Scheduler Production Deployment System**

---

## 🎯 **Overview**

This guide covers the complete blue-green deployment system for JW Attendant Scheduler, including MCP server usage, state management, and deployment workflows.

---

## 📋 **Table of Contents**

1. [System Architecture](#system-architecture)
2. [Quick Start](#quick-start)
3. [MCP Server Usage](#mcp-server-usage)
4. [Deployment Workflows](#deployment-workflows)
5. [State Management](#state-management)
6. [Troubleshooting](#troubleshooting)
7. [Reference](#reference)

---

## 🏗️ **System Architecture**

### **Infrastructure Components**

```
┌─────────────────────────────────────────────────────────┐
│                    HAProxy (10.92.3.26)                 │
│              Load Balancer + State Tracker              │
│         https://attendant.cloudigan.net                 │
└─────────────────┬───────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼────┐       ┌────▼────┐
    │  BLUE   │       │  GREEN  │
    │ 10.92.3.22│     │10.92.3.24│
    │ (Prod)  │       │(Standby)│
    └────┬────┘       └────┬────┘
         │                 │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   PostgreSQL    │
         │   10.92.3.21    │
         │   (Shared DB)   │
         └─────────────────┘
```

### **Server Roles**

| Server | IP | Container | Role | Port |
|--------|------------|-----------|------|------|
| BLUE | 10.92.3.22 | 132 | Production/Standby | 3001 |
| GREEN | 10.92.3.24 | 134 | Standby/Production | 3001 |
| HAProxy | 10.92.3.26 | 136 | Load Balancer | 80/443 |
| PostgreSQL | 10.92.3.21 | 131 | Database | 5432 |

### **Key Features**

- ✅ Zero-downtime deployments
- ✅ Instant rollback capability
- ✅ Persistent state tracking
- ✅ Automated health checks
- ✅ One-command deployment via MCP
- ✅ Git-based workflow
- ✅ Schema migration support

---

## 🚀 **Quick Start**

### **Prerequisites**

1. **Windsurf IDE** with MCP server enabled
2. **SSH access** to all servers (configured in `~/.ssh/config`)
3. **Git credentials** set up on BLUE and GREEN
4. **MCP server** loaded in Windsurf

### **Basic Deployment Flow**

```bash
# 1. Check current status
"Check deployment status"

# 2. Deploy to standby
"Deploy to standby"

# 3. Switch traffic
"Switch traffic to standby"
```

That's it! The MCP server handles everything else.

---

## 🤖 **MCP Server Usage**

### **Available Tools**

The blue-green MCP server provides three powerful tools:

#### **1. get_deployment_status**

**Purpose:** Check which server is PROD/STANDBY and their health

**Usage in Cascade:**
```
Check deployment status
What's the current deployment status?
Show me PROD and STANDBY servers
```

**Returns:**
```json
{
  "current": {
    "prod": {
      "server": "BLUE",
      "ip": "10.92.3.22",
      "container": 132,
      "healthy": true,
      "status": "✅ ONLINE"
    },
    "standby": {
      "server": "GREEN",
      "ip": "10.92.3.24",
      "container": 134,
      "healthy": true,
      "status": "✅ READY"
    }
  },
  "haproxy": {
    "backend": "blue",
    "status": "✅ OPERATIONAL"
  },
  "history": {
    "lastSwitch": "2025-10-25T12:00:00.000Z",
    "totalSwitches": 5
  }
}
```

---

#### **2. deploy_to_standby**

**Purpose:** Deploy latest code to STANDBY server with automated checks

**Usage in Cascade:**
```
Deploy to standby
Deploy latest code to standby
Deploy to standby with migrations
```

**Parameters:**
- `pullGithub` (default: true) - Pull latest from GitHub
- `runMigrations` (default: false) - Run database migrations
- `createBackup` (default: true) - Create backups first

**What it does:**
1. ✅ Creates database and code backups
2. ✅ Pulls latest code from GitHub
3. ✅ Installs dependencies (`npm install`)
4. ✅ Runs migrations (if requested)
5. ✅ Builds application (`npm run build`)
6. ✅ Restarts PM2 process
7. ✅ Runs health checks
8. ✅ Validates deployment

**Example Output:**
```
✅ Deployment to GREEN (10.92.3.24) completed successfully!

Creating backup...
✅ Backups created
Pulling latest code from GitHub...
✅ Code pulled successfully
Installing dependencies...
✅ Dependencies installed
Building application...
✅ Build complete
Restarting server...
✅ Server restarted
Running health checks...
✅ Health check passed

✅ STANDBY is ready for traffic switch
```

---

#### **3. switch_traffic**

**Purpose:** Switch traffic from PROD to STANDBY (with safety checks)

**Usage in Cascade:**
```
Switch traffic to standby
Switch traffic
Approve traffic switch
```

**Parameters:**
- `requireApproval` (default: true) - Require manual approval
- `emergency` (default: false) - Emergency rollback mode

**Two-Step Process:**

**Step 1 - Approval Request:**
```
⚠️ TRAFFIC SWITCH APPROVAL REQUIRED

Current PROD: BLUE (10.92.3.22)
New PROD: GREEN (10.92.3.24)

This will:
1. Switch HAProxy to route traffic to GREEN
2. Swap PROD/STANDBY roles
3. Update state tracking

To proceed, run: switch_traffic with requireApproval=false
To cancel, take no action.
```

**Step 2 - Execute:**
```
Switch traffic without approval
```

**Result:**
```
✅ TRAFFIC SWITCH COMPLETE!

New PROD: GREEN (10.92.3.24)
New STANDBY: BLUE (10.92.3.22)

Switch #6 completed at 2025-10-25T12:30:00.000Z

Production URL: https://attendant.cloudigan.net
HAProxy Stats: http://10.92.3.26:8404
```

---

## 🔄 **Deployment Workflows**

### **Workflow 1: Standard Feature Deployment**

**Scenario:** Deploy a new feature to production

```
1. Develop on GREEN (or local)
2. Commit and push to GitHub
3. "Check deployment status"
   → Verify BLUE is PROD, GREEN is STANDBY
4. "Deploy to standby"
   → Deploys to GREEN, runs health checks
5. Test GREEN manually: http://10.92.3.24:3001
6. "Switch traffic to standby"
   → Approval request shown
7. "Switch traffic without approval"
   → GREEN becomes PROD
8. Monitor production
9. If issues: "Switch traffic" (rollback to BLUE)
```

**Timeline:** ~5-10 minutes

---

### **Workflow 2: Database Migration Deployment**

**Scenario:** Deploy code with schema changes

```
1. Develop migration on GREEN
2. Test migration locally
3. Commit and push to GitHub
4. "Check deployment status"
5. "Deploy to standby with migrations"
   → Creates pre-migration backup
   → Runs Prisma migrations
   → Deploys code
6. Test GREEN thoroughly
7. "Switch traffic to standby"
8. Monitor for migration issues
```

**Important:** Migrations run on shared database, affecting both servers!

---

### **Workflow 3: Emergency Rollback**

**Scenario:** Production issue detected, need immediate rollback

```
1. "Check deployment status"
   → Identify current PROD
2. "Switch traffic with emergency mode"
   → Skips health checks
   → Immediate switch to STANDBY
3. Investigate issue on old PROD (now STANDBY)
4. Fix and redeploy when ready
```

**Timeline:** ~30 seconds

---

### **Workflow 4: Hotfix Deployment**

**Scenario:** Critical bug fix needed in production

```
1. "Check deployment status"
   → Note which is PROD
2. Fix bug on STANDBY server directly
3. Test fix on STANDBY
4. Commit fix to GitHub
5. "Switch traffic"
   → Hotfix goes live
6. Deploy fix to new STANDBY
7. Both servers now have fix
```

**Timeline:** ~3-5 minutes

---

## 📊 **State Management**

### **State File Location**

```
HAProxy: /var/lib/jw-deployment/state.json
```

### **State Structure**

```json
{
  "prod": "blue",
  "standby": "green",
  "lastSwitch": "2025-10-25T12:00:00.000Z",
  "switchCount": 5,
  "history": [
    {
      "timestamp": "2025-10-25T12:00:00.000Z",
      "from": "green",
      "to": "blue"
    }
  ]
}
```

### **Manual State Management**

**Get current state:**
```bash
ssh haproxy "/usr/local/bin/jw-deployment-state.sh get"
```

**Update state manually:**
```bash
ssh haproxy "/usr/local/bin/jw-deployment-state.sh set blue green"
```

**View state file:**
```bash
ssh haproxy "cat /var/lib/jw-deployment/state.json"
```

---

## 🔧 **Troubleshooting**

### **Issue: Health Checks Failing**

**Symptoms:**
```
Status: ❌ DOWN (health check failed)
```

**Causes:**
1. `/api/health` endpoint doesn't exist (see BACKLOG INFRA-001)
2. Server not running
3. Wrong port

**Solutions:**
```bash
# Check if server is running
ssh jwa "pm2 list | grep jw-attendant"
ssh jwg "pm2 list | grep jw-attendant"

# Check server response
curl -I http://10.92.3.22:3001/
curl -I http://10.92.3.24:3001/

# Restart if needed
ssh jwa "pm2 restart jw-attendant-blue"
ssh jwg "pm2 restart jw-attendant"
```

---

### **Issue: Cannot Switch Traffic**

**Symptoms:**
```
❌ Cannot switch traffic: STANDBY is not healthy!
```

**Solution:**
1. Check STANDBY health manually
2. Fix any issues
3. Retry switch
4. Or use emergency mode (skips health checks)

---

### **Issue: State Out of Sync**

**Symptoms:**
- MCP shows different PROD than HAProxy
- State file doesn't match reality

**Solution:**
```bash
# Check HAProxy config
ssh haproxy "grep default_backend /etc/haproxy/haproxy.cfg | grep jw_attendant"

# Check state file
ssh haproxy "/usr/local/bin/jw-deployment-state.sh get"

# Manually sync if needed
ssh haproxy "/usr/local/bin/jw-deployment-state.sh set <actual-prod> <actual-standby>"
```

---

### **Issue: Git Push Fails**

**Symptoms:**
```
fatal: Authentication failed
```

**Solution:**
```bash
# Verify git credentials on servers
ssh jwa "cd /opt/jw-attendant-scheduler && git remote -v"
ssh jwg "cd /opt/jw-attendant-scheduler && git remote -v"

# Test git pull
ssh jwa "cd /opt/jw-attendant-scheduler && git pull origin production-gold-standard"
ssh jwg "cd /opt/jw-attendant-scheduler && git pull origin production-gold-standard"

# If needed, update credentials (see GIT_CREDENTIALS_SETUP.md)
```

---

### **Issue: MCP Server Not Loading**

**Symptoms:**
- MCP server shows as "errored" or "disabled"
- Tools not available in Cascade

**Solution:**
```bash
# Test server manually
cd /Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-blue-green
/opt/homebrew/bin/node server.js

# Check for errors
# Restart Windsurf IDE
# Verify mcp_config.json has correct path
```

---

## 📚 **Reference**

### **SSH Shortcuts**

```bash
jwa     # BLUE (10.92.3.22)
jwg     # GREEN (10.92.3.24)
haproxy # HAProxy (10.92.3.26)
postgres # PostgreSQL (10.92.3.21)
prox    # Proxmox host (10.92.0.5)
```

### **Important Files**

```
# MCP Server
/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-blue-green/server.js

# State Tracking
/var/lib/jw-deployment/state.json (on HAProxy)
/usr/local/bin/jw-deployment-state.sh (on HAProxy)

# SSH Config
~/.ssh/config

# Git Credentials
~/.git-credentials (on Mac, BLUE, GREEN)

# Application
/opt/jw-attendant-scheduler/ (on BLUE and GREEN)
```

### **Key Commands**

```bash
# Check PM2 status
ssh jwa "pm2 list"
ssh jwg "pm2 list"

# Restart application
ssh jwa "pm2 restart jw-attendant-blue"
ssh jwg "pm2 restart jw-attendant"

# View logs
ssh jwa "pm2 logs jw-attendant-blue --lines 50"
ssh jwg "pm2 logs jw-attendant --lines 50"

# Check HAProxy backend
ssh haproxy "grep default_backend /etc/haproxy/haproxy.cfg | grep jw_attendant"

# Reload HAProxy
ssh haproxy "systemctl reload haproxy"

# Check database
ssh postgres "sudo -u postgres psql -l"
```

### **URLs**

```
Production: https://attendant.cloudigan.net
BLUE Direct: http://10.92.3.22:3001
GREEN Direct: http://10.92.3.24:3001
HAProxy Stats: http://10.92.3.26:8404
```

### **PM2 Process Names**

```
BLUE: jw-attendant-blue
GREEN: jw-attendant
```

---

## 🎯 **Best Practices**

### **1. Always Test on STANDBY First**

Never deploy directly to PROD. Always:
1. Deploy to STANDBY
2. Test thoroughly
3. Then switch traffic

### **2. Monitor After Switch**

After switching traffic:
- Watch PM2 logs for errors
- Check application metrics
- Monitor user feedback
- Be ready to rollback

### **3. Keep STANDBY Updated**

After each switch, deploy to new STANDBY so both servers stay in sync.

### **4. Use Migrations Carefully**

Database migrations affect both servers. Test thoroughly before running in production.

### **5. Document Changes**

Keep deployment notes in git commits and track switch history.

---

## 🔐 **Security Notes**

- SSH keys stored in `~/.ssh/`
- Git credentials in `~/.git-credentials` (600 permissions)
- State file on HAProxy (root access only)
- Database credentials in `.env` files (not in git)

---

## 📈 **Metrics**

Track these metrics for deployment quality:

- **Deployment frequency:** How often you deploy
- **Deployment duration:** Time from start to production
- **Rollback rate:** Percentage of deployments rolled back
- **Downtime:** Should be zero with blue-green
- **Switch count:** Tracked in state file

---

## 🎓 **Learning Resources**

- [Blue-Green Deployment Plan](./BLUE_GREEN_DEPLOYMENT_PLAN.md)
- [Git Credentials Setup](./GIT_CREDENTIALS_SETUP.md)
- [MCP Server README](./mcp-blue-green/README.md)
- [Backlog](./BACKLOG.md) - See INFRA-001 and INFRA-002

---

## ✅ **Checklist: First Deployment**

- [ ] MCP server loaded in Windsurf
- [ ] SSH access to all servers working
- [ ] Git credentials configured
- [ ] Check deployment status
- [ ] Deploy to standby successfully
- [ ] Test standby manually
- [ ] Switch traffic with approval
- [ ] Monitor production
- [ ] Document any issues

---

**Last Updated:** October 25, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
