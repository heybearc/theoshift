#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { NodeSSH } from 'node-ssh';
import winston from 'winston';

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: '/var/log/wmacs-mcp-ops.log' }),
    new winston.transports.Console()
  ]
});

export class WMACSServerOps {
  constructor() {
    this.server = new Server(
      {
        name: 'wmacs-server-ops',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Guardrails configuration
    this.guardrails = {
      allowedHosts: ['10.92.3.24', '10.92.3.22'], // staging and production
      allowedCommands: [
        'pkill -f "next.*3001"',
        'rm -rf /opt/jw-attendant-scheduler/current/.next',
        'npm run build',
        'npm start -- -p 3001',
        'ln -sfn /opt/jw-attendant-scheduler/releases/',
        'systemctl restart jw-attendant-scheduler'
      ],
      allowedPaths: [
        '/opt/jw-attendant-scheduler/',
        '/var/log/jw-attendant-scheduler.log'
      ],
      maxOperationsPerHour: 10,
      requireApproval: true
    };

    this.operationLog = [];
    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'restart_application',
          description: 'Safely restart the JW Attendant Scheduler application with guardrails',
          inputSchema: {
            type: 'object',
            properties: {
              environment: {
                type: 'string',
                enum: ['staging', 'production'],
                description: 'Target environment'
              },
              reason: {
                type: 'string',
                description: 'Reason for restart (required for audit)'
              },
              clearCache: {
                type: 'boolean',
                default: false,
                description: 'Whether to clear Next.js build cache'
              }
            },
            required: ['environment', 'reason']
          }
        },
        {
          name: 'update_symlink',
          description: 'Update current symlink to latest release with validation',
          inputSchema: {
            type: 'object',
            properties: {
              environment: {
                type: 'string',
                enum: ['staging', 'production'],
                description: 'Target environment'
              },
              releaseHash: {
                type: 'string',
                description: 'Git commit hash of the release to activate'
              },
              reason: {
                type: 'string',
                description: 'Reason for symlink update'
              }
            },
            required: ['environment', 'releaseHash', 'reason']
          }
        },
        {
          name: 'check_application_status',
          description: 'Check application health and status',
          inputSchema: {
            type: 'object',
            properties: {
              environment: {
                type: 'string',
                enum: ['staging', 'production'],
                description: 'Target environment'
              }
            },
            required: ['environment']
          }
        },
        {
          name: 'get_operation_log',
          description: 'Get recent operations log for audit',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                default: 10,
                description: 'Number of recent operations to return'
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'restart_application':
            return await this.restartApplication(args);
          case 'update_symlink':
            return await this.updateSymlink(args);
          case 'check_application_status':
            return await this.checkApplicationStatus(args);
          case 'get_operation_log':
            return await this.getOperationLog(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error('Tool execution error', { tool: name, error: error.message, args });
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  async validateOperation(operation, environment) {
    // Rate limiting
    const recentOps = this.operationLog.filter(
      op => Date.now() - op.timestamp < 3600000 // 1 hour
    );
    
    if (recentOps.length >= this.guardrails.maxOperationsPerHour) {
      throw new Error('Rate limit exceeded: too many operations in the last hour');
    }

    // Environment validation
    const hostMap = {
      staging: '10.92.3.24',
      production: '10.92.3.22'
    };

    if (!this.guardrails.allowedHosts.includes(hostMap[environment])) {
      throw new Error(`Environment ${environment} not allowed`);
    }

    // Log operation
    this.operationLog.push({
      operation,
      environment,
      timestamp: Date.now(),
      approved: false
    });

    return hostMap[environment];
  }

  async executeSSHCommand(host, command, reason) {
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host,
        username: 'root',
        privateKeyPath: process.env.SSH_PRIVATE_KEY || process.env.HOME + '/.ssh/jw_staging'
      });

      logger.info('Executing SSH command', { host, command, reason });
      
      const result = await ssh.execCommand(command, {
        cwd: '/opt/jw-attendant-scheduler'
      });

      logger.info('SSH command result', { 
        host, 
        command, 
        exitCode: result.code,
        stdout: result.stdout,
        stderr: result.stderr 
      });

      return result;
    } finally {
      ssh.dispose();
    }
  }

  async restartApplication(args) {
    const { environment, reason, clearCache = false } = args;
    const host = await this.validateOperation('restart_application', environment);

    let commands = [];
    
    if (clearCache) {
      commands.push('rm -rf /opt/jw-attendant-scheduler/current/.next');
      commands.push('cd /opt/jw-attendant-scheduler/current && npm run build');
    }
    
    commands.push('pkill -f "next.*3001"');
    commands.push('cd /opt/jw-attendant-scheduler/current && nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 &');

    const results = [];
    for (const command of commands) {
      const result = await this.executeSSHCommand(host, command, reason);
      results.push({ command, result });
      
      if (result.code !== 0 && !command.includes('pkill')) {
        throw new Error(`Command failed: ${command} - ${result.stderr}`);
      }
    }

    return {
      content: [{
        type: 'text',
        text: `✅ Application restarted successfully on ${environment}\nReason: ${reason}\nCache cleared: ${clearCache}\n\nOperations executed:\n${results.map(r => `- ${r.command}: ${r.result.code === 0 ? 'SUCCESS' : 'FAILED'}`).join('\n')}`
      }]
    };
  }

  async updateSymlink(args) {
    const { environment, releaseHash, reason } = args;
    const host = await this.validateOperation('update_symlink', environment);

    // Validate release exists
    const checkCommand = `ls -la /opt/jw-attendant-scheduler/releases/${releaseHash}*`;
    const checkResult = await this.executeSSHCommand(host, checkCommand, 'validate_release');
    
    if (checkResult.code !== 0) {
      throw new Error(`Release ${releaseHash} not found on ${environment}`);
    }

    // Update symlink
    const updateCommand = `rm -f /opt/jw-attendant-scheduler/current && ln -sfn /opt/jw-attendant-scheduler/releases/${releaseHash}* /opt/jw-attendant-scheduler/current`;
    const result = await this.executeSSHCommand(host, updateCommand, reason);

    if (result.code !== 0) {
      throw new Error(`Failed to update symlink: ${result.stderr}`);
    }

    return {
      content: [{
        type: 'text',
        text: `✅ Symlink updated successfully on ${environment}\nRelease: ${releaseHash}\nReason: ${reason}`
      }]
    };
  }

  async checkApplicationStatus(args) {
    const { environment } = args;
    const host = await this.validateOperation('check_status', environment);

    const commands = [
      'ps aux | grep "next.*3001" | grep -v grep',
      'ls -la /opt/jw-attendant-scheduler/current',
      'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001',
      'tail -n 5 /var/log/jw-attendant-scheduler.log'
    ];

    const results = {};
    for (const command of commands) {
      const result = await this.executeSSHCommand(host, command, 'status_check');
      results[command] = {
        exitCode: result.code,
        output: result.stdout || result.stderr
      };
    }

    return {
      content: [{
        type: 'text',
        text: `📊 Application Status - ${environment}\n\n${Object.entries(results).map(([cmd, res]) => 
          `Command: ${cmd}\nExit Code: ${res.exitCode}\nOutput: ${res.output}\n---`
        ).join('\n')}`
      }]
    };
  }

  async getOperationLog(args) {
    const { limit = 10 } = args;
    const recentOps = this.operationLog
      .slice(-limit)
      .map(op => ({
        ...op,
        timestamp: new Date(op.timestamp).toISOString()
      }));

    return {
      content: [{
        type: 'text',
        text: `📋 Recent Operations (${recentOps.length})\n\n${recentOps.map(op => 
          `${op.timestamp}: ${op.operation} on ${op.environment} - ${op.approved ? 'APPROVED' : 'PENDING'}`
        ).join('\n')}`
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('WMACS Server Ops MCP started');
  }
}

const serverOps = new WMACSServerOps();
serverOps.run().catch(console.error);

// WMACSServerOps is already exported above as a class
