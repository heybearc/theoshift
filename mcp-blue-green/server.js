#!/usr/bin/env node

/**
 * Blue-Green Deployment MCP Server
 * Handles PROD/STANDBY orchestration for JW Attendant Scheduler and LDC Construction Tools
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
  'jw-attendant': {
    name: 'JW Attendant Scheduler',
    blueIp: '10.92.3.22',
    greenIp: '10.92.3.24',
    blueContainer: 132,
    greenContainer: 134,
    haproxyBackend: 'jw_attendant',
    sshBlue: 'jwa',
    sshGreen: 'jwg',
    path: '/opt/jw-attendant-scheduler',
    branch: 'production-gold-standard',
    pmBlue: 'jw-attendant-blue',
    pmGreen: 'jw-attendant',
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
    branchBlue: 'main',
    branchGreen: 'dev',
    pmBlue: 'ldc-production',
    pmGreen: 'ldc-production',
  },
};

const HAPROXY_IP = '10.92.3.26';
const DB_IP = '10.92.3.21';

// Get current deployment state from HAProxy
async function getDeploymentState() {
  try {
    const { stdout } = await execAsync(`ssh haproxy "/usr/local/bin/jw-deployment-state.sh get"`);
    return JSON.parse(stdout);
  } catch (error) {
    // Fallback to default state
    return {
      prod: 'blue',
      standby: 'green',
      lastSwitch: null,
      switchCount: 0,
    };
  }
}

// Save deployment state to HAProxy
async function saveDeploymentState(state) {
  try {
    await execAsync(`ssh haproxy "/usr/local/bin/jw-deployment-state.sh set ${state.prod} ${state.standby}"`);
  } catch (error) {
    console.error('Failed to save state:', error.message);
    throw error;
  }
}

// Check server health
async function checkHealth(ip, app) {
  try {
    // LDC Tools returns 307 redirect on root, JW Attendant has /api/health
    const endpoint = app === 'ldc-tools' ? '/' : '/api/health';
    const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://${ip}:3001${endpoint}`);
    const code = stdout.trim();
    // 200 = healthy, 307 = redirect (LDC Tools root redirects to login)
    return code === '200' || code === '307';
  } catch (error) {
    return false;
  }
}

// Get HAProxy current backend for an app
async function getHAProxyBackend(app) {
  try {
    const appConfig = APPS[app];
    const { stdout } = await execAsync(`ssh root@${HAPROXY_IP} "grep 'use_backend ${appConfig.haproxyBackend}' /etc/haproxy/haproxy.cfg | head -1"`);
    if (stdout.includes(`${appConfig.haproxyBackend}_blue`)) {
      return 'blue';
    } else if (stdout.includes(`${appConfig.haproxyBackend}_green`)) {
      return 'green';
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
      description: 'Get current PROD and STANDBY server status with health checks',
      inputSchema: {
        type: 'object',
        properties: {
          app: {
            type: 'string',
            description: 'Application to check (jw-attendant or ldc-tools)',
            enum: ['jw-attendant', 'ldc-tools'],
            default: 'jw-attendant',
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
            description: 'Application to deploy (jw-attendant or ldc-tools)',
            enum: ['jw-attendant', 'ldc-tools'],
            default: 'jw-attendant',
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
      description: 'Switch traffic from PROD to STANDBY (requires approval)',
      inputSchema: {
        type: 'object',
        properties: {
          app: {
            type: 'string',
            description: 'Application to switch (jw-attendant or ldc-tools)',
            enum: ['jw-attendant', 'ldc-tools'],
            default: 'jw-attendant',
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
    const app = args.app || 'jw-attendant';
    const appConfig = APPS[app];
    const haproxyBackend = await getHAProxyBackend(app);
    const state = await getDeploymentState();
    
    // Determine actual PROD/STANDBY based on HAProxy
    const actualProd = haproxyBackend !== 'error' ? haproxyBackend : state.prod;
    const actualStandby = actualProd === 'blue' ? 'green' : 'blue';
    
    const prodIp = actualProd === 'blue' ? appConfig.blueIp : appConfig.greenIp;
    const standbyIp = actualStandby === 'blue' ? appConfig.blueIp : appConfig.greenIp;

    const prodHealth = await checkHealth(prodIp, app);
    const standbyHealth = await checkHealth(standbyIp, app);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            app: appConfig.name,
            current: {
              prod: {
                server: actualProd.toUpperCase(),
                ip: prodIp,
                container: actualProd === 'blue' ? appConfig.blueContainer : appConfig.greenContainer,
                healthy: prodHealth,
                status: prodHealth ? '✅ ONLINE' : '❌ DOWN',
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
    const app = args.app || 'jw-attendant';
    const appConfig = APPS[app];
    const haproxyBackend = await getHAProxyBackend(app);
    const state = await getDeploymentState();
    const actualProd = haproxyBackend !== 'error' ? haproxyBackend : state.prod;
    const actualStandby = actualProd === 'blue' ? 'green' : 'blue';
    const standbyIp = actualStandby === 'blue' ? appConfig.blueIp : appConfig.greenIp;
    const standbyName = actualStandby;
    const standbyShortcut = actualStandby === 'blue' ? appConfig.sshBlue : appConfig.sshGreen;

    let steps = [];

    try {
      // Step 1: Create backup (if requested)
      if (args.createBackup) {
        steps.push('Creating backup...');
        if (app === 'jw-attendant') {
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
        await execAsync(`ssh root@${DB_IP} "sudo -u postgres pg_dump jw_attendant_scheduler_staging | gzip > /mnt/data/jw-attendant-backups/database/manual/pre-migration-$(date +%Y%m%d_%H%M%S).sql.gz"`);
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
    const app = args.app || 'jw-attendant';
    const appConfig = APPS[app];
    const haproxyBackend = await getHAProxyBackend(app);
    const state = await getDeploymentState();
    const actualProd = haproxyBackend !== 'error' ? haproxyBackend : state.prod;
    const actualStandby = actualProd === 'blue' ? 'green' : 'blue';
    
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
                  `Current PROD: ${actualProd.toUpperCase()} (${actualProd === 'blue' ? appConfig.blueIp : appConfig.greenIp})\n` +
                  `New PROD: ${actualStandby.toUpperCase()} (${standbyIp})\n\n` +
                  `This will:\n` +
                  `1. Switch HAProxy to route traffic to ${actualStandby.toUpperCase()}\n` +
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
      const newProd = actualStandby;
      const newStandby = actualProd;
      const newBackend = newProd === 'blue' ? `${appConfig.haproxyBackend}_blue` : `${appConfig.haproxyBackend}_green`;

      // Update HAProxy config
      await execAsync(`ssh root@${HAPROXY_IP} "sed -i 's/use_backend ${appConfig.haproxyBackend}_.*if is_${appConfig.haproxyBackend === 'jw_attendant' ? 'jw_attendant' : 'ldc'}/use_backend ${newBackend} if is_${appConfig.haproxyBackend === 'jw_attendant' ? 'jw_attendant' : 'ldc'}/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"`);

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
                  `App: ${appConfig.name}\n` +
                  `New PROD: ${newProd.toUpperCase()} (${standbyIp})\n` +
                  `New STANDBY: ${newStandby.toUpperCase()} (${actualProd === 'blue' ? appConfig.blueIp : appConfig.greenIp})\n\n` +
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
