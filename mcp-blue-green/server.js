#!/usr/bin/env node

/**
 * Blue-Green Deployment MCP Server
 * Handles PROD/STANDBY orchestration for Theocratic Shift Scheduler and LDC Construction Tools
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

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

// Configuration
const APPS = {
  'theoshift': {
    name: 'Theocratic Shift Scheduler',
    blueIp: '10.92.3.24',
    greenIp: '10.92.3.22',
    blueContainer: 134,
    greenContainer: 132,
    haproxyBackend: 'theoshift',
    sshBlue: 'root@10.92.3.24',
    sshGreen: 'root@10.92.3.22',
    path: '/opt/theoshift',
    branch: 'main',
    pmBlue: 'theoshift-blue',
    pmGreen: 'theoshift-green',
    healthEndpoint: '/api/health',
  },
  'ldc-tools': {
    name: 'LDC Tools',
    blueIp: '10.92.3.23',
    greenIp: '10.92.3.25',
    blueContainer: 133,
    greenContainer: 135,
    haproxyBackend: 'ldc',
    sshBlue: 'ldc',
    sshGreen: 'ldc-staging',
    path: '/opt/ldc-construction-tools/frontend',
    branch: 'main',  // Both use main branch
    pmBlue: 'ldc-production',
    pmGreen: 'ldc-staging',
    healthEndpoint: '/api/auth/providers',
  },
};

const HAPROXY_IP = '10.92.3.26';
const HAPROXY_CONTAINER = 136;
const DB_IP = '10.92.3.21';

// Get current deployment state from HAProxy (per-app)
async function getDeploymentState(app = 'theoshift') {
  try {
    const stateFile = app === 'ldc-tools' ? 'ldc-deployment-state.json' : 'theoshift-deployment-state.json';
    const { stdout } = await execAsync(`ssh prox "pct exec ${HAPROXY_CONTAINER} -- cat /var/lib/haproxy/${stateFile} 2>/dev/null || echo '{}'"`);
    const state = JSON.parse(stdout || '{}');
    return {
      live: state.prod || state.live || 'blue',
      standby: state.standby || 'green',
      lastSwitch: state.lastSwitch || null,
      switchCount: state.switchCount || 0,
    };
  } catch (error) {
    // Fallback to default state
    return {
      live: 'blue',
      standby: 'green',
      lastSwitch: null,
      switchCount: 0,
    };
  }
}

// Save deployment state to HAProxy (per-app)
async function saveDeploymentState(state, app = 'theoshift') {
  try {
    const stateFile = app === 'ldc-tools' ? 'ldc-deployment-state.json' : 'theoshift-deployment-state.json';
    const stateJson = JSON.stringify(state);
    await execAsync(`ssh prox "pct exec ${HAPROXY_CONTAINER} -- bash -c 'echo \\\"${stateJson}\\\" > /var/lib/haproxy/${stateFile}'"`);
  } catch (error) {
    console.error('Failed to save state:', error.message);
    throw error;
  }
}

// Check server health
async function checkHealth(ip, app) {
  try {
    const appConfig = APPS[app];
    const endpoint = appConfig.healthEndpoint || '/api/health';
    const port = '3001';  // Both apps use port 3001
    const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://${ip}:${port}${endpoint}`);
    const code = stdout.trim();
    return code === '200';
  } catch (error) {
    return false;
  }
}

// Get HAProxy current backend for an app
async function getHAProxyBackend(app) {
  try {
    const appConfig = APPS[app];
    // Look for the main routing rule (use_backend X if is_appname)
    const { stdout } = await execAsync(`ssh prox "pct exec ${HAPROXY_CONTAINER} -- grep 'use_backend ${appConfig.haproxyBackend}.*if is_${appConfig.haproxyBackend === 'jw_attendant' ? 'jw_attendant' : 'ldc'}$' /etc/haproxy/haproxy.cfg | head -1"`);
    // Check which backend is being used (the backend name comes right after use_backend)
    const match = stdout.match(/use_backend\s+(\S+)/);
    if (match) {
      const backend = match[1];
      if (backend.endsWith('_blue')) return 'blue';
      if (backend.endsWith('_green')) return 'green';
    }
    return 'unknown';
  } catch (error) {
    return 'error';
  }
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_deployment_status',
      description: 'Get current LIVE and STANDBY server status with health checks',
      inputSchema: {
        type: 'object',
        properties: {
          app: {
            type: 'string',
            description: 'Application to check (theoshift or ldc-tools)',
            enum: ['theoshift', 'ldc-tools'],
            default: 'theoshift',
          },
        },
      },
    },
    {
      name: 'deploy_to_standby',
      description: 'Deploy code to STANDBY server with automated health checks',
      inputSchema: {
        type: 'object',
        properties: {
          app: {
            type: 'string',
            description: 'Application to deploy (theoshift or ldc-tools)',
            enum: ['theoshift', 'ldc-tools'],
            default: 'theoshift',
          },
          pullGithub: {
            type: 'boolean',
            description: 'Pull latest code from GitHub',
            default: true,
          },
          runMigrations: {
            type: 'boolean',
            description: 'Run database migrations',
            default: false,
          },
          createBackup: {
            type: 'boolean',
            description: 'Create backup before deployment',
            default: true,
          },
        },
      },
    },
    {
      name: 'switch_traffic',
      description: 'Switch traffic from LIVE to STANDBY (requires approval)',
      inputSchema: {
        type: 'object',
        properties: {
          app: {
            type: 'string',
            description: 'Application to switch (theoshift or ldc-tools)',
            enum: ['theoshift', 'ldc-tools'],
            default: 'theoshift',
          },
          requireApproval: {
            type: 'boolean',
            description: 'Require manual approval before switching',
            default: true,
          },
          emergency: {
            type: 'boolean',
            description: 'Emergency rollback mode (skip health checks)',
            default: false,
          },
        },
      },
    },
  ],
}));

// Tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_deployment_status') {
    const app = args.app || 'theoshift';
    const appConfig = APPS[app];
    const haproxyBackend = await getHAProxyBackend(app);
    const state = await getDeploymentState(app);
    
    // Determine actual LIVE/STANDBY based on HAProxy
    const actualLive = haproxyBackend !== 'error' ? haproxyBackend : state.live;
    const actualStandby = actualLive === 'blue' ? 'green' : 'blue';
    
    const liveIp = actualLive === 'blue' ? appConfig.blueIp : appConfig.greenIp;
    const standbyIp = actualStandby === 'blue' ? appConfig.blueIp : appConfig.greenIp;

    const liveHealth = await checkHealth(liveIp, app);
    const standbyHealth = await checkHealth(standbyIp, app);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            app: appConfig.name,
            current: {
              live: {
                server: actualLive.toUpperCase(),
                ip: liveIp,
                container: actualLive === 'blue' ? appConfig.blueContainer : appConfig.greenContainer,
                healthy: liveHealth,
                status: liveHealth ? '✅ ONLINE' : '❌ DOWN',
              },
              standby: {
                server: actualStandby.toUpperCase(),
                ip: standbyIp,
                container: actualStandby === 'blue' ? appConfig.blueContainer : appConfig.greenContainer,
                healthy: standbyHealth,
                status: standbyHealth ? '✅ READY' : '❌ DOWN',
              },
            },
            haproxy: {
              backend: haproxyBackend,
              status: haproxyBackend !== 'error' ? '✅ OPERATIONAL' : '❌ ERROR',
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
    const app = args.app || 'theoshift';
    const appConfig = APPS[app];
    const haproxyBackend = await getHAProxyBackend(app);
    const state = await getDeploymentState(app);
    const actualLive = haproxyBackend !== 'error' ? haproxyBackend : state.live;
    const actualStandby = actualLive === 'blue' ? 'green' : 'blue';
    const standbyIp = actualStandby === 'blue' ? appConfig.blueIp : appConfig.greenIp;
    const standbyName = actualStandby;
    const standbyShortcut = actualStandby === 'blue' ? appConfig.sshBlue : appConfig.sshGreen;

    let steps = [];

    try {
      // Step 1: Create backup (if requested)
      if (args.createBackup) {
        steps.push('Creating backup...');
        if (app === 'theoshift') {
          await execAsync(`ssh root@${DB_IP} "/usr/local/bin/backup-jw-scheduler.sh"`);
          await execAsync(`ssh ${standbyShortcut} "/usr/local/bin/backup-to-nfs.sh"`);
        } else {
          // LDC Tools - simple git stash backup
          await execAsync(`ssh ${standbyShortcut} "cd ${appConfig.path} && git stash save 'pre-deploy-backup-$(date +%Y%m%d_%H%M%S)' 2>/dev/null || true"`);
        }
        steps.push('✅ Backups created');
      }

      // Step 2: Pull from GitHub (if requested)
      if (args.pullGithub) {
        steps.push('Pulling latest code from GitHub...');
        // Use branch-specific config if available, otherwise fall back to single branch
        const branch = actualStandby === 'green' 
          ? (appConfig.branchGreen || appConfig.branch)
          : (appConfig.branchBlue || appConfig.branch);
        await execAsync(`ssh ${standbyShortcut} "cd ${appConfig.path} && git fetch origin && git checkout ${branch} && git pull origin ${branch}"`);
        steps.push(`✅ Code pulled from ${branch} branch`);
      }

      // Step 3: Install dependencies
      steps.push('Installing dependencies...');
      const npmInstallFlag = app === 'ldc-tools' ? '--legacy-peer-deps' : '';
      await execAsync(`ssh ${standbyShortcut} "cd ${appConfig.path} && npm install ${npmInstallFlag}"`);
      steps.push('✅ Dependencies installed');

      // Step 4: Run migrations (if requested)
      if (args.runMigrations) {
        steps.push('Creating database backup...');
        await execAsync(`ssh root@${DB_IP} "sudo -u postgres pg_dump theoshift_scheduler_staging | gzip > /mnt/data/theoshift-green-backups/database/manual/pre-migration-$(date +%Y%m%d_%H%M%S).sql.gz"`);
        steps.push('✅ Pre-migration backup created');

        steps.push('Running migrations...');
        await execAsync(`ssh ${standbyShortcut} "cd ${appConfig.path} && npx prisma migrate deploy"`);
        steps.push('✅ Migrations applied');
      }

      // Step 5: Build
      steps.push('Building application...');
      await execAsync(`ssh ${standbyShortcut} "cd ${appConfig.path} && npm run build"`);
      steps.push('✅ Build complete');

      // Step 6: Restart
      steps.push('Restarting server...');
      const pmName = actualStandby === 'blue' ? appConfig.pmBlue : appConfig.pmGreen;
      await execAsync(`ssh ${standbyShortcut} "cd ${appConfig.path} && pm2 restart ${pmName}"`);
      steps.push('✅ Server restarted');

      // Step 7: Health check
      steps.push('Running health checks...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for startup
      const healthy = await checkHealth(standbyIp, app);

      if (!healthy) {
        throw new Error('Health check failed after deployment');
      }
      steps.push('✅ Health check passed');

      return {
        content: [
          {
            type: 'text',
            text: `✅ Deployment to ${standbyName.toUpperCase()} (${standbyIp}) completed successfully!\n\n` +
                  steps.join('\n') +
                  `\n\n✅ STANDBY is ready for traffic switch\n` +
                  `\nAccess: http://${standbyIp}:3001`,
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
    const app = args.app || 'theoshift';
    const appConfig = APPS[app];
    const haproxyBackend = await getHAProxyBackend(app);
    const state = await getDeploymentState(app);
    const actualLive = haproxyBackend !== 'error' ? haproxyBackend : state.live;
    const actualStandby = actualLive === 'blue' ? 'green' : 'blue';
    
    // Check standby health
    const standbyIp = actualStandby === 'blue' ? appConfig.blueIp : appConfig.greenIp;
    const standbyHealthy = await checkHealth(standbyIp, app);

    if (!standbyHealthy && !args.emergency) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Cannot switch traffic: STANDBY (${actualStandby.toUpperCase()}) is not healthy!\n\nRun health checks and fix issues before switching.`,
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
                  `App: ${appConfig.name}\n` +
                  `Current LIVE: ${actualLive.toUpperCase()} (${actualLive === 'blue' ? appConfig.blueIp : appConfig.greenIp})\n` +
                  `New LIVE: ${actualStandby.toUpperCase()} (${standbyIp})\n\n` +
                  `This will:\n` +
                  `1. Switch HAProxy to route traffic to ${actualStandby.toUpperCase()}\n` +
                  `2. Swap LIVE/STANDBY roles\n` +
                  `3. Update state tracking\n\n` +
                  `To proceed, run: switch_traffic with requireApproval=false\n` +
                  `To cancel, take no action.`,
          },
        ],
      };
    }

    // Perform the switch
    try {
      const newLive = actualStandby;
      const newStandby = actualLive;
      const newBackend = newLive === 'blue' ? `${appConfig.haproxyBackend}_blue` : `${appConfig.haproxyBackend}_green`;

      // Update HAProxy config
      await execAsync(`ssh prox "pct exec ${HAPROXY_CONTAINER} -- bash -c \\"sed -i 's/use_backend ${appConfig.haproxyBackend}_.*if is_${appConfig.haproxyBackend === 'jw_attendant' ? 'jw_attendant' : 'ldc'}/use_backend ${newBackend} if is_${appConfig.haproxyBackend === 'jw_attendant' ? 'jw_attendant' : 'ldc'}/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy\\"`);

      // Update state
      const newState = {
        prod: newLive,
        live: newLive,
        standby: newStandby,
        lastSwitch: new Date().toISOString(),
        switchCount: state.switchCount + 1,
      };
      await saveDeploymentState(newState, app);

      return {
        content: [
          {
            type: 'text',
            text: `✅ TRAFFIC SWITCH COMPLETE!\n\n` +
                  `App: ${appConfig.name}\n` +
                  `New LIVE: ${newLive.toUpperCase()} (${standbyIp})\n` +
                  `New STANDBY: ${newStandby.toUpperCase()} (${actualLive === 'blue' ? appConfig.blueIp : appConfig.greenIp})\n\n` +
                  `Switch #${newState.switchCount} completed at ${newState.lastSwitch}\n\n` +
                  `HAProxy Stats: http://${HAPROXY_IP}:8404`,
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
