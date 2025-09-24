#!/usr/bin/env node

/**
 * WMACS Base MCP Server
 * 
 * Shared foundation for all WMACS MCP servers across projects
 * Provides common functionality, security, and guardrails
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class WMACSBaseMCPServer {
  constructor(config) {
    this.config = {
      name: config.name || 'wmacs-mcp-server',
      version: config.version || '1.0.0',
      maxOperationsPerHour: config.maxOperationsPerHour || 10,
      operationLog: config.operationLog || '/var/log/wmacs-mcp-ops.log',
      allowedHosts: config.allowedHosts || [],
      allowedPaths: config.allowedPaths || [],
      containers: config.containers || {},
      ...config
    };

    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.operationCount = new Map();
    this.tools = new Map();
    
    // Add common WMACS tools
    this.addCommonTools();
  }

  addCommonTools() {
    // Health check tool (available to all WMACS MCP servers)
    this.addTool('wmacs_health_check', {
      description: 'Check WMACS system health across environments',
      inputSchema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            enum: ['staging', 'production', 'all'],
            description: 'Environment to check'
          }
        },
        required: ['environment']
      }
    }, async (args) => {
      return await this.performHealthCheck(args.environment);
    });

    // System status tool
    this.addTool('wmacs_system_status', {
      description: 'Get comprehensive WMACS system status',
      inputSchema: {
        type: 'object',
        properties: {
          includeMetrics: {
            type: 'boolean',
            description: 'Include performance metrics'
          }
        }
      }
    }, async (args) => {
      return await this.getSystemStatus(args.includeMetrics);
    });
  }

  addTool(name, schema, handler) {
    this.tools.set(name, { schema, handler });
  }

  async performHealthCheck(environment) {
    const results = {
      timestamp: new Date().toISOString(),
      environment,
      checks: {}
    };

    if (environment === 'all') {
      for (const [envName, envConfig] of Object.entries(this.config.containers)) {
        results.checks[envName] = await this.checkEnvironment(envConfig);
      }
    } else {
      const envConfig = this.config.containers[environment];
      if (envConfig) {
        results.checks[environment] = await this.checkEnvironment(envConfig);
      }
    }

    return results;
  }

  async checkEnvironment(envConfig) {
    try {
      // Check if container is accessible
      const pingCmd = `ping -c 1 ${envConfig.ip}`;
      await execAsync(pingCmd);

      // Check if ports are open
      const portChecks = {};
      for (const port of envConfig.ports || []) {
        try {
          const portCmd = `nc -z ${envConfig.ip} ${port}`;
          await execAsync(portCmd);
          portChecks[port] = 'open';
        } catch {
          portChecks[port] = 'closed';
        }
      }

      return {
        status: 'healthy',
        ip: envConfig.ip,
        container: envConfig.id,
        ports: portChecks,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  async getSystemStatus(includeMetrics = false) {
    const status = {
      timestamp: new Date().toISOString(),
      server: this.config.name,
      version: this.config.version,
      operationCounts: Object.fromEntries(this.operationCount),
      availableTools: Array.from(this.tools.keys())
    };

    if (includeMetrics) {
      status.metrics = await this.collectMetrics();
    }

    return status;
  }

  async collectMetrics() {
    // Override in project-specific servers
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  async validateOperation(toolName, args) {
    // Rate limiting
    const hour = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = `${toolName}-${hour}`;
    const count = this.operationCount.get(key) || 0;
    
    if (count >= this.config.maxOperationsPerHour) {
      throw new Error(`Rate limit exceeded for ${toolName}. Max ${this.config.maxOperationsPerHour} operations per hour.`);
    }
    
    this.operationCount.set(key, count + 1);

    // Log operation
    await this.logOperation(toolName, args);
  }

  async logOperation(toolName, args) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      server: this.config.name,
      tool: toolName,
      args: args,
      pid: process.pid
    };

    try {
      await fs.appendFile(this.config.operationLog, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.entries()).map(([name, tool]) => ({
        name,
        description: tool.schema.description,
        inputSchema: tool.schema.inputSchema
      }))
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      await this.validateOperation(name, args);
      
      try {
        const result = await tool.handler(args || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async run() {
    this.setupHandlers();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.config.name} MCP server running on stdio`);
  }
}

module.exports = WMACSBaseMCPServer;
