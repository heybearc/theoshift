# JW ATTENDANT SCHEDULER - BLUE-GREEN DEPLOYMENT PLAN
**Complete Implementation Guide with MCP Integration**

---

## 🎯 **CURRENT STATUS (as of Oct 24, 2025)**

### ✅ **COMPLETED:**
1. **Infrastructure Setup** - Blue/Green containers operational
2. **Shared Database** - Both environments using same production DB
3. **HAProxy Configuration** - Load balancer configured and routing
4. **Code Synchronization** - Green synced from Blue's working codebase
5. **Schema Fixes** - All relationship mismatches resolved
6. **Production Stability** - Blue locked and serving users

### 🎯 **CURRENT STATE:**
```
┌─────────────────────────────────────────────────┐
│              HAProxy (136)                      │
│         10.92.3.26:80                          │
│    Routes: attendant.cloudigan.net             │
└─────────────┬───────────────────────────────────┘
              │
              ├──► BLUE (132) - 10.92.3.22:3001
              │    Status: ✅ PROD (Active)
              │    Users: Working
              │    DO NOT TOUCH
              │
              └──► GREEN (134) - 10.92.3.24:3001
                   Status: ✅ STANDBY (Ready)
                   Same code as Blue
                   Available for testing/fixes
                   
                   ↓
                   
            Database (131) - 10.92.3.21
            ✅ SHARED: jw_attendant_scheduler_staging
            (needs rename to _production)
```

### 📊 **DATA VERIFIED:**
- Users: 10
- Feedback: 14
- Attendants: 173
- Events: 1
- Positions: 35
- Event Documents: 3

---

## 📋 **REMAINING IMPLEMENTATION PHASES**

### **Phase 1: Database Consolidation & Backup** ✅ COMPLETED

#### 1.1 Backup Current State ✅
- Backup script updated to only backup `jw_attendant_scheduler_staging`
- Fresh backup created: `db-jw-scheduler-20251025_062754.sql.gz`
- Automated daily backups at 2:00 AM with 30-day retention

#### 1.2 Verify Both Environments Use Same DB ✅
- BLUE: `jw_attendant_scheduler_staging@10.92.3.21`
- GREEN: `jw_attendant_scheduler_staging@10.92.3.21`
- ✅ Confirmed: Both share the same production database

#### 1.3 Unused Databases Dropped ✅
- ❌ `jw_attendant_scheduler` - DROPPED
- ❌ `jw_attendant_scheduler_prod` - DROPPED
- ❌ `jw_scheduler_prod` - DROPPED
- ✅ Only `jw_attendant_scheduler_staging` remains (actual production DB)

#### 1.4 Database Rename - SCHEDULED FOR MAINTENANCE WINDOW
**Status:** Postponed until after November 2, 2025 event
**Reason:** Requires downtime to both BLUE and GREEN
**Plan:** See `DATABASE_RENAME_MAINTENANCE_PLAN.md` for detailed procedure
**Note:** Current name `jw_attendant_scheduler_staging` is cosmetic only - does not affect functionality

#### 1.5 Git Repository Setup ✅ COMPLETED
- ✅ GREEN initialized as full git repository
- ✅ Both BLUE and GREEN synced to `production-gold-standard` branch
- ✅ Both at commit: `29ae880` (identical)
- ✅ GitHub serves as central source of truth and backup
- 📄 See `BLUE_GREEN_GIT_WORKFLOW.md` for complete workflow documentation

---

### **Phase 2: Schema Baseline & Migration System** (30 min)

#### 2.1 Extract Blue's Schema (Source of Truth)
```bash
# Blue has the working schema
ssh root@10.92.3.22 "cd /opt/jw-attendant-scheduler && npx prisma db pull --force"

# Copy to local
scp root@10.92.3.22:/opt/jw-attendant-scheduler/prisma/schema.prisma ./prisma/schema_baseline.prisma
```

#### 2.2 Initialize Prisma Migrations
```bash
# Create migrations directory
mkdir -p prisma/migrations

# Create baseline migration
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema_baseline.prisma \
  --script > prisma/migrations/0_baseline/migration.sql

# Mark as applied in database
ssh root@10.92.3.21 "sudo -u postgres psql jw_attendant_scheduler_production -c \"
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMP,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP,
    started_at TIMESTAMP NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO _prisma_migrations (id, checksum, migration_name, applied_steps_count)
  VALUES (gen_random_uuid(), 'baseline', '0_baseline', 1)
  ON CONFLICT DO NOTHING;
\""
```

---

### **Phase 3: MCP Blue-Green Orchestration Server** (60 min)

#### 3.1 Create New Dedicated MCP Server
```bash
# Create new MCP server directory
mkdir -p /Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-blue-green

# Create server file
cat > /Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-blue-green/blue-green-mcp.js << 'EOF'
#!/usr/bin/env node

/**
 * Blue-Green Deployment MCP Server
 * Handles PROD/STANDBY orchestration for JW Attendant Scheduler
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

const server = new Server(
  {
    name: 'blue-green-deployment',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// State tracking
const STATE_FILE = '/tmp/jw-deployment-state.json';
const BLUE_IP = '10.92.3.22';
const GREEN_IP = '10.92.3.24';
const HAPROXY_IP = '10.92.3.26';
const DB_IP = '10.92.3.21';

// Tool 1: Get Deployment Status
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'get_deployment_status',
      description: 'Get current PROD and STANDBY server status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'deploy_to_standby',
      description: 'Deploy code to STANDBY server with health checks',
      inputSchema: {
        type: 'object',
        properties: {
          pullGithub: {
            type: 'boolean',
            description: 'Pull latest code from GitHub',
            default: false,
          },
          runMigrations: {
            type: 'boolean',
            description: 'Run database migrations',
            default: false,
          },
        },
      },
    },
    {
      name: 'switch_traffic',
      description: 'Switch traffic from PROD to STANDBY (requires approval)',
      inputSchema: {
        type: 'object',
        properties: {
          requireApproval: {
            type: 'boolean',
            description: 'Require manual approval before switching',
            default: true,
          },
          emergency: {
            type: 'boolean',
            description: 'Emergency rollback mode',
            default: false,
          },
        },
      },
    },
  ],
}));

// Get current deployment state
async function getDeploymentState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Initialize state if not exists
    return {
      prod: 'blue',
      standby: 'green',
      lastSwitch: null,
      switchCount: 0,
    };
  }
}

// Save deployment state
async function saveDeploymentState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

// Check server health
async function checkHealth(ip) {
  try {
    const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://${ip}:3001/api/health`);
    return stdout.trim() === '200';
  } catch (error) {
    return false;
  }
}

// Tool implementations
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_deployment_status') {
    const state = await getDeploymentState();
    const prodIp = state.prod === 'blue' ? BLUE_IP : GREEN_IP;
    const standbyIp = state.standby === 'blue' ? BLUE_IP : GREEN_IP;

    const prodHealth = await checkHealth(prodIp);
    const standbyHealth = await checkHealth(standbyIp);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            current: {
              prod: {
                server: state.prod.toUpperCase(),
                ip: prodIp,
                container: state.prod === 'blue' ? 132 : 134,
                healthy: prodHealth,
                status: prodHealth ? '✅ ONLINE' : '❌ DOWN',
              },
              standby: {
                server: state.standby.toUpperCase(),
                ip: standbyIp,
                container: state.standby === 'blue' ? 132 : 134,
                healthy: standbyHealth,
                status: standbyHealth ? '✅ READY' : '❌ DOWN',
              },
            },
            history: {
              lastSwitch: state.lastSwitch,
              totalSwitches: state.switchCount,
            },
          }, null, 2),
        },
      ],
    };
  }

  if (name === 'deploy_to_standby') {
    const state = await getDeploymentState();
    const standbyIp = state.standby === 'blue' ? BLUE_IP : GREEN_IP;
    const standbyName = state.standby;

    let steps = [];

    try {
      // Step 1: Pull from GitHub (if requested)
      if (args.pullGithub) {
        steps.push('Pulling latest code from GitHub...');
        await execAsync(`ssh root@${standbyIp} "cd /opt/jw-attendant-scheduler && git pull origin production-gold-standard"`);
        steps.push('✅ Code pulled successfully');
      }

      // Step 2: Run migrations (if requested)
      if (args.runMigrations) {
        steps.push('Creating database backup...');
        await execAsync(`ssh root@${DB_IP} "sudo -u postgres pg_dump jw_attendant_scheduler_production > /tmp/backup_\$(date +%Y%m%d_%H%M%S).sql"`);
        steps.push('✅ Backup created');

        steps.push('Running migrations...');
        await execAsync(`ssh root@${standbyIp} "cd /opt/jw-attendant-scheduler && npx prisma migrate deploy"`);
        steps.push('✅ Migrations applied');
      }

      // Step 3: Build and restart
      steps.push('Building application...');
      await execAsync(`ssh root@${standbyIp} "cd /opt/jw-attendant-scheduler && pm2 stop jw-attendant && rm -rf .next && npm run build"`);
      steps.push('✅ Build complete');

      steps.push('Restarting server...');
      await execAsync(`ssh root@${standbyIp} "cd /opt/jw-attendant-scheduler && pm2 start jw-attendant"`);
      steps.push('✅ Server restarted');

      // Step 4: Health check
      steps.push('Running health checks...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for startup
      const healthy = await checkHealth(standbyIp);

      if (!healthy) {
        throw new Error('Health check failed after deployment');
      }
      steps.push('✅ Health check passed');

      return {
        content: [
          {
            type: 'text',
            text: `Deployment to ${standbyName.toUpperCase()} (${standbyIp}) completed successfully!\n\n` +
                  steps.join('\n') +
                  `\n\n✅ STANDBY is ready for traffic switch`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Deployment failed!\n\n` +
                  steps.join('\n') +
                  `\n\nError: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'switch_traffic') {
    const state = await getDeploymentState();
    
    // Check standby health
    const standbyIp = state.standby === 'blue' ? BLUE_IP : GREEN_IP;
    const standbyHealthy = await checkHealth(standbyIp);

    if (!standbyHealthy && !args.emergency) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Cannot switch traffic: STANDBY (${state.standby.toUpperCase()}) is not healthy!\n\nRun health checks and fix issues before switching.`,
          },
        ],
        isError: true,
      };
    }

    if (args.requireApproval && !args.emergency) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ TRAFFIC SWITCH APPROVAL REQUIRED\n\n` +
                  `Current PROD: ${state.prod.toUpperCase()} (${state.prod === 'blue' ? BLUE_IP : GREEN_IP})\n` +
                  `New PROD: ${state.standby.toUpperCase()} (${standbyIp})\n\n` +
                  `This will:\n` +
                  `1. Switch HAProxy to route traffic to ${state.standby.toUpperCase()}\n` +
                  `2. Swap PROD/STANDBY roles\n` +
                  `3. Update state tracking\n\n` +
                  `To proceed, run: switch_traffic with requireApproval=false\n` +
                  `To cancel, take no action.`,
          },
        ],
      };
    }

    // Perform the switch
    try {
      const newProd = state.standby;
      const newStandby = state.prod;
      const newProdBackend = newProd === 'blue' ? 'blue' : 'green';

      // Update HAProxy config
      await execAsync(`ssh root@${HAPROXY_IP} "sed -i 's/server ${state.prod} .*/server ${newProd} ${standbyIp}:3001 check/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"`);

      // Update state
      const newState = {
        prod: newProd,
        standby: newStandby,
        lastSwitch: new Date().toISOString(),
        switchCount: state.switchCount + 1,
      };
      await saveDeploymentState(newState);

      return {
        content: [
          {
            type: 'text',
            text: `✅ TRAFFIC SWITCH COMPLETE!\n\n` +
                  `New PROD: ${newProd.toUpperCase()} (${standbyIp})\n` +
                  `New STANDBY: ${newStandby.toUpperCase()} (${state.prod === 'blue' ? BLUE_IP : GREEN_IP})\n\n` +
                  `Switch #${newState.switchCount} completed at ${newState.lastSwitch}\n\n` +
                  `Monitor: http://${HAPROXY_IP}:8404`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Traffic switch failed!\n\nError: ${error.message}\n\nManual intervention required.`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Blue-Green Deployment MCP Server running');
}

main().catch(console.error);
EOF

chmod +x /Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-blue-green/blue-green-mcp.js
```

#### 3.2 Create MCP Configuration
```json
{
  "mcpServers": {
    "blue-green-deployment": {
      "command": "node",
      "args": [
        "/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-blue-green/blue-green-mcp.js"
      ],
      "disabled": false
    },
    "enhanced-jw-mcp-cicd": {
      "disabled": true
    },
    "enhanced-ldc-mcp-cicd": {
      "disabled": true
    },
    "federation-coordinator-cicd": {
      "disabled": true
    }
  }
}
```

---

### **Phase 4: HAProxy State Tracking** (15 min)

#### 4.1 Create State Directory
```bash
ssh root@10.92.3.26 "
  mkdir -p /etc/haproxy/state
  echo 'blue' > /etc/haproxy/state/current_prod
  echo 'green' > /etc/haproxy/state/current_standby
  chmod 644 /etc/haproxy/state/*
"
```

#### 4.2 Update HAProxy Config
```bash
ssh root@10.92.3.26 "cat > /etc/haproxy/haproxy.cfg << 'EOF'
global
    log /dev/log local0
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

# HAProxy Stats Web UI
listen stats
    bind *:8404
    stats enable
    stats uri /
    stats refresh 30s
    stats admin if TRUE
    stats auth admin:Cloudy_92!

# Blue-Green Frontend
frontend jw_attendant_frontend
    bind *:80
    default_backend jw_attendant_prod

# Production Backend (currently Blue)
backend jw_attendant_prod
    balance roundrobin
    option httpchk GET /api/health
    server blue 10.92.3.22:3001 check

# Standby Backend (currently Green)  
backend jw_attendant_standby
    balance roundrobin
    option httpchk GET /api/health
    server green 10.92.3.24:3001 check
EOF

systemctl reload haproxy
"
```

---

### **Phase 5: Documentation & Workflows** (20 min)

#### 5.1 Create Blue-Green Workflow
```bash
cat > /Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/.windsurf/workflows/blue-green-deployment.md << 'EOF'
---
description: Blue-Green Deployment Workflow for JW Attendant Scheduler
---

# Blue-Green Deployment Workflow

## Terminology
- **PROD**: Currently serving live traffic
- **STANDBY**: Backup server for development and testing
- Roles alternate with each deployment

## Quick Reference

### Check Status
\`\`\`bash
# Via MCP
get_deployment_status

# Manual
ssh root@10.92.3.26 "cat /etc/haproxy/state/current_prod"
\`\`\`

### Development Workflow

1. **Check which server is STANDBY**
   \`\`\`bash
   get_deployment_status
   \`\`\`

2. **Develop on STANDBY**
   \`\`\`bash
   # SSH to standby (shown in status)
   ssh root@<standby-ip>
   cd /opt/jw-attendant-scheduler
   
   # Make changes, test locally
   npm run build
   pm2 restart jw-attendant
   \`\`\`

3. **Deploy to STANDBY**
   \`\`\`bash
   # Via MCP (recommended)
   deploy_to_standby --pullGithub true --runMigrations false
   
   # Manual
   ssh root@<standby-ip> "cd /opt/jw-attendant-scheduler && git pull && npm run build && pm2 restart jw-attendant"
   \`\`\`

4. **Test STANDBY thoroughly**
   - Access directly: http://<standby-ip>:3001
   - Test all critical features
   - Check logs for errors
   - Verify with production data

5. **Switch Traffic**
   \`\`\`bash
   # Via MCP (requires approval)
   switch_traffic --requireApproval true
   
   # Confirm when prompted
   switch_traffic --requireApproval false
   \`\`\`

6. **Monitor new PROD**
   - HAProxy stats: http://10.92.3.26:8404
   - Application logs
   - User reports

### Emergency Rollback
\`\`\`bash
# Immediate rollback to previous PROD
switch_traffic --emergency true --requireApproval false
\`\`\`

### Server Information

**Blue (Container 132):**
- IP: 10.92.3.22
- Port: 3001
- SSH: \`ssh root@10.92.3.22\`

**Green (Container 134):**
- IP: 10.92.3.24
- Port: 3001
- SSH: \`ssh root@10.92.3.24\`

**HAProxy (Container 136):**
- IP: 10.92.3.26
- Stats: http://10.92.3.26:8404
- SSH: \`ssh root@10.92.3.26\`

**Database (Container 131):**
- IP: 10.92.3.21
- Database: jw_attendant_scheduler_production
- SSH: \`ssh root@10.92.3.21\`

### Migration Safety Rules

**✅ SAFE:**
- Add new tables
- Add new columns (with defaults)
- Add indexes
- Add constraints (non-blocking)

**❌ DANGEROUS:**
- Drop tables
- Drop columns
- Change column types
- Remove constraints

**⚠️ REQUIRES PLANNING:**
- Rename columns (multi-step)
- Data transformations
- Schema restructuring
EOF
```

---

## 🚀 **EXECUTION PLAN FOR TOMORROW**

### **Morning Session (2 hours)**

1. **Phase 1: Database Consolidation** (20 min)
   - [ ] Backup production database
   - [ ] Verify both environments use same DB
   - [ ] Schedule database rename (if maintenance window available)

2. **Phase 2: Migration Baseline** (30 min)
   - [ ] Extract Blue's schema as baseline
   - [ ] Initialize Prisma migrations
   - [ ] Create migration tracking table

3. **Phase 3: MCP Server** (60 min)
   - [ ] Create blue-green MCP server
   - [ ] Implement three core tools
   - [ ] Test MCP functionality
   - [ ] Disable old MCP servers

### **Afternoon Session (1 hour)**

4. **Phase 4: HAProxy State** (15 min)
   - [ ] Create state tracking directory
   - [ ] Update HAProxy configuration
   - [ ] Verify stats page access

5. **Phase 5: Documentation** (20 min)
   - [ ] Create workflow documentation
   - [ ] Update deployment runbook
   - [ ] Document rollback procedures

6. **Phase 6: Testing** (25 min)
   - [ ] Test deployment to STANDBY
   - [ ] Test traffic switch (dry run)
   - [ ] Test rollback procedure
   - [ ] Verify monitoring

---

## ✅ **SUCCESS CRITERIA**

- [ ] MCP server operational with 3 tools working
- [ ] Can deploy to STANDBY without touching PROD
- [ ] Can switch traffic with single command
- [ ] Can rollback in under 1 minute
- [ ] Complete audit trail of all operations
- [ ] Zero downtime during switches
- [ ] Old MCP servers disabled

---

## 📝 **NOTES**

- **PROD is locked** - Only touch via traffic switch
- **STANDBY is playground** - Test everything here first
- **Database is shared** - Changes affect both immediately
- **Migrations require backup** - Always backup before schema changes
- **MCP handles safety** - Use MCP tools, not manual SSH

---

**Last Updated:** October 24, 2025
**Status:** 90% Complete - Ready for final implementation
**Next Session:** Complete Phases 1-6 (3 hours total)
