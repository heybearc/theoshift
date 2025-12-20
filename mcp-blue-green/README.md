# Blue-Green Deployment MCP Server
**One-Command Deployment for Theocratic Shift Scheduler**

---

## 🎯 **WHAT IT DOES**

This MCP server provides three powerful tools for blue-green deployment:

1. **`get_deployment_status`** - Check which server is PROD/STANDBY
2. **`deploy_to_standby`** - Deploy code to standby with health checks
3. **`switch_traffic`** - Switch traffic between BLUE and GREEN

---

## ✅ **INSTALLATION COMPLETE**

### **MCP Server Location:**
```
/Users/cory/Documents/Cloudy-Work/applications/theoshift/mcp-blue-green/
```

### **Windsurf Configuration:**
```json
"jw-blue-green-deployment": {
    "command": "node",
    "args": ["/Users/cory/Documents/Cloudy-Work/applications/theoshift/mcp-blue-green/server.js"],
    "env": {
        "NODE_ENV": "production"
    }
}
```

### **Restart Required:**
⚠️ **You need to restart Windsurf IDE** for the MCP server to load!

---

## 🚀 **HOW TO USE**

### **1. Check Deployment Status**

**In Cascade chat:**
```
Check the deployment status
```

**What it returns:**
- Current PROD server (BLUE or GREEN)
- Current STANDBY server
- Health status of both
- HAProxy backend configuration
- Deployment history

**Example output:**
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

### **2. Deploy to Standby**

**In Cascade chat:**
```
Deploy the latest code to standby
```

**Or with options:**
```
Deploy to standby with migrations
```

**What it does:**
1. ✅ Creates backups (database + code)
2. ✅ Pulls latest code from GitHub
3. ✅ Installs dependencies
4. ✅ Runs migrations (if requested)
5. ✅ Builds application
6. ✅ Restarts server
7. ✅ Runs health checks

**Parameters:**
- `pullGithub` (default: true) - Pull from GitHub
- `runMigrations` (default: false) - Run database migrations
- `createBackup` (default: true) - Create backups first

**Example output:**
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

Access: http://10.92.3.24:3001
```

---

### **3. Switch Traffic**

**In Cascade chat:**
```
Switch traffic to standby
```

**What it does:**
1. ✅ Checks STANDBY health
2. ✅ Requests approval (safety check)
3. ✅ Updates HAProxy configuration
4. ✅ Reloads HAProxy
5. ✅ Swaps PROD/STANDBY roles
6. ✅ Updates state tracking

**Parameters:**
- `requireApproval` (default: true) - Require manual approval
- `emergency` (default: false) - Emergency rollback mode

**Two-step process:**

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

Production URL: https://theoshift.com
HAProxy Stats: http://10.92.3.26:8404
```

---

## 🎯 **COMPLETE WORKFLOW EXAMPLE**

### **Scenario: Deploy New Feature**

```
You: Check deployment status

Cascade: [Shows BLUE is PROD, GREEN is STANDBY, both healthy]

You: Deploy latest code to standby with migrations

Cascade: [Deploys to GREEN, runs migrations, health checks pass]

You: Switch traffic to standby

Cascade: [Shows approval request]

You: Switch traffic without approval

Cascade: [Switches traffic, GREEN is now PROD]

You: Check deployment status

Cascade: [Shows GREEN is PROD, BLUE is STANDBY]
```

---

## 🔧 **TECHNICAL DETAILS**

### **State Management:**
- State file: `/tmp/theoshift-deployment-state.json`
- Tracks: current PROD, STANDBY, switch history
- Syncs with HAProxy configuration

### **Health Checks:**
- Endpoint: `http://{ip}:3001/api/health`
- Expected: HTTP 200 status
- Timeout: 5 seconds after restart

### **Server Configuration:**
```javascript
BLUE_IP = '10.92.3.22'      // Container 132 (green-theoshift)
GREEN_IP = '10.92.3.24'     // Container 134 (blue-theoshift)
HAPROXY_IP = '10.92.3.26'   // Container 136
DB_IP = '10.92.3.21'        // Container 131
```

### **SSH Shortcuts:**
- `jwa` - BLUE server
- `jwg` - GREEN server
- Uses existing SSH key authentication

---

## 🛡️ **SAFETY FEATURES**

### **Built-in Protections:**
1. ✅ Health checks before switching
2. ✅ Approval requirement (can be bypassed)
3. ✅ Automatic backups before deployment
4. ✅ Pre-migration database backups
5. ✅ Emergency rollback mode

### **Rollback Procedure:**
If something goes wrong after switch:
```
You: Switch traffic to standby with emergency mode

Cascade: [Immediately switches back to previous PROD]
```

---

## 📋 **COMPARISON WITH MANUAL WORKFLOW**

### **Manual (Old Way):**
```bash
# 1. Check status
ssh blue-theoshift "pm2 status"
ssh green-theoshift "pm2 status"

# 2. Deploy
ssh blue-theoshift "cd /opt/theoshift && git pull && npm install && npm run build && pm2 restart theoshift-green"

# 3. Test
curl http://10.92.3.24:3001/api/health

# 4. Switch
ssh haproxy "sed -i 's/default_backend.*/default_backend jw_attendant_green/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"

# Total: ~10 minutes, error-prone
```

### **MCP (New Way):**
```
You: Deploy to standby and switch traffic

Cascade: [Does everything automatically with safety checks]

# Total: ~2 minutes, automated, safe
```

---

## 🎉 **BENEFITS**

### **Speed:**
- ✅ 5x faster than manual process
- ✅ One command vs 10+ commands
- ✅ No context switching

### **Safety:**
- ✅ Automated health checks
- ✅ Automatic backups
- ✅ Approval gates
- ✅ Consistent process

### **Reliability:**
- ✅ No typos or mistakes
- ✅ Always follows best practices
- ✅ Complete audit trail
- ✅ Easy rollback

---

## 🔄 **NEXT STEPS**

1. **Restart Windsurf IDE** to load the MCP server
2. **Test the tools** with "Check deployment status"
3. **Try a deployment** to standby
4. **Practice switching** traffic

---

**Created:** October 25, 2025
**Status:** ✅ READY TO USE (after Windsurf restart)
**Version:** 1.0.0
