#!/usr/bin/env node

/**
 * Blue-Green Deployment MCP Server
 * Handles PROD/STANDBY orchestration for JW Attendant Scheduler
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
const STATE_FILE = '/tmp/jw-deployment-state.json';
const BLUE_IP = '10.92.3.22';
const GREEN_IP = '10.92.3.24';
const HAPROXY_IP = '10.92.3.26';
const DB_IP = '10.92.3.21';

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

// Get HAProxy current backend
async function getHAProxyBackend() {
  try {
    const { stdout } = await execAsync(`ssh root@${HAPROXY_IP} "grep 'default_backend' /etc/haproxy/haproxy.cfg | grep jw_attendant"`);
    if (stdout.includes('jw_attendant_blue')) {
      return 'blue';
    } else if (stdout.includes('jw_attendant_green')) {
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
        properties: {},
      },
    },
    {
      name: 'deploy_to_standby',
      description: 'Deploy code to STANDBY server with automated health checks',
      inputSchema: {
        type: 'object',
        properties: {
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
    const haproxyBackend = await getHAProxyBackend();
    const state = await getDeploymentState();
    
    // Determine actual PROD/STANDBY based on HAProxy
    const actualProd = haproxyBackend !== 'error' ? haproxyBackend : state.prod;
    const actualStandby = actualProd === 'blue' ? 'green' : 'blue';
    
    const prodIp = actualProd === 'blue' ? BLUE_IP : GREEN_IP;
    const standbyIp = actualStandby === 'blue' ? BLUE_IP : GREEN_IP;

    const prodHealth = await checkHealth(prodIp);
    const standbyHealth = await checkHealth(standbyIp);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            current: {
              prod: {
                server: actualProd.toUpperCase(),
                ip: prodIp,
                container: actualProd === 'blue' ? 132 : 134,
                healthy: prodHealth,
                status: prodHealth ? '✅ ONLINE' : '❌ DOWN',
              },
              standby: {
                server: actualStandby.toUpperCase(),
                ip: standbyIp,
                container: actualStandby === 'blue' ? 132 : 134,
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
    const haproxyBackend = await getHAProxyBackend();
    const state = await getDeploymentState();
    const actualProd = haproxyBackend !== 'error' ? haproxyBackend : state.prod;
    const actualStandby = actualProd === 'blue' ? 'green' : 'blue';
    const standbyIp = actualStandby === 'blue' ? BLUE_IP : GREEN_IP;
    const standbyName = actualStandby;
    const standbyShortcut = actualStandby === 'blue' ? 'jwa' : 'jwg';

    let steps = [];

    try {
      // Step 1: Create backup (if requested)
      if (args.createBackup) {
        steps.push('Creating backup...');
        await execAsync(`ssh root@${DB_IP} "/usr/local/bin/backup-jw-scheduler.sh"`);
        await execAsync(`ssh ${standbyShortcut} "/usr/local/bin/backup-to-nfs.sh"`);
        steps.push('✅ Backups created');
      }

      // Step 2: Pull from GitHub (if requested)
      if (args.pullGithub) {
        steps.push('Pulling latest code from GitHub...');
        await execAsync(`ssh ${standbyShortcut} "cd /opt/jw-attendant-scheduler && git pull origin production-gold-standard"`);
        steps.push('✅ Code pulled successfully');
      }

      // Step 3: Install dependencies
      steps.push('Installing dependencies...');
      await execAsync(`ssh ${standbyShortcut} "cd /opt/jw-attendant-scheduler && npm install"`);
      steps.push('✅ Dependencies installed');

      // Step 4: Run migrations (if requested)
      if (args.runMigrations) {
        steps.push('Creating database backup...');
        await execAsync(`ssh root@${DB_IP} "sudo -u postgres pg_dump jw_attendant_scheduler_staging | gzip > /mnt/data/jw-attendant-backups/database/manual/pre-migration-$(date +%Y%m%d_%H%M%S).sql.gz"`);
        steps.push('✅ Pre-migration backup created');

        steps.push('Running migrations...');
        await execAsync(`ssh ${standbyShortcut} "cd /opt/jw-attendant-scheduler && npx prisma migrate deploy"`);
        steps.push('✅ Migrations applied');
      }

      // Step 5: Build
      steps.push('Building application...');
      await execAsync(`ssh ${standbyShortcut} "cd /opt/jw-attendant-scheduler && npm run build"`);
      steps.push('✅ Build complete');

      // Step 6: Restart
      steps.push('Restarting server...');
      const pmName = actualStandby === 'blue' ? 'jw-attendant-blue' : 'jw-attendant';
      await execAsync(`ssh ${standbyShortcut} "cd /opt/jw-attendant-scheduler && pm2 restart ${pmName}"`);
      steps.push('✅ Server restarted');

      // Step 7: Health check
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
    const haproxyBackend = await getHAProxyBackend();
    const state = await getDeploymentState();
    const actualProd = haproxyBackend !== 'error' ? haproxyBackend : state.prod;
    const actualStandby = actualProd === 'blue' ? 'green' : 'blue';
    
    // Check standby health
    const standbyIp = actualStandby === 'blue' ? BLUE_IP : GREEN_IP;
    const standbyHealthy = await checkHealth(standbyIp);

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
                  `Current PROD: ${actualProd.toUpperCase()} (${actualProd === 'blue' ? BLUE_IP : GREEN_IP})\n` +
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
      const newBackend = newProd === 'blue' ? 'jw_attendant_blue' : 'jw_attendant_green';

      // Update HAProxy config
      await execAsync(`ssh root@${HAPROXY_IP} "sed -i 's/default_backend jw_attendant_.*/default_backend ${newBackend}/' /etc/haproxy/haproxy.cfg && systemctl reload haproxy"`);

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
                  `New STANDBY: ${newStandby.toUpperCase()} (${actualProd === 'blue' ? BLUE_IP : GREEN_IP})\n\n` +
                  `Switch #${newState.switchCount} completed at ${newState.lastSwitch}\n\n` +
                  `Production URL: https://attendant.cloudigan.net\n` +
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
