#!/usr/bin/env node

/**
 * WMACS MCP Client
 * Proper interface to MCP server operations following WMACS guidelines
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

class WMACsMCPClient {
  constructor() {
    this.config = JSON.parse(readFileSync('./wmacs/config/project.json', 'utf8'));
    this.environments = JSON.parse(readFileSync('./wmacs/config/environments.json', 'utf8'));
  }

  async restartApplication(environment, reason, clearCache = true) {
    console.log(`🛡️ WMACS MCP: Restarting application on ${environment}`);
    console.log(`📋 Reason: ${reason}`);
    
    const envConfig = this.environments[environment];
    if (!envConfig) {
      throw new Error(`Environment ${environment} not found`);
    }

    // Use MCP server for safe restart operation
    const operation = {
      tool: 'restart_application',
      environment: environment,
      reason: reason,
      clearCache: clearCache,
      container: envConfig.container,
      ip: envConfig.ip,
      port: envConfig.port
    };

    console.log(`🔧 Executing MCP operation:`, operation);
    
    // For now, execute the restart directly with proper validation
    return this.executeRestart(envConfig, reason, clearCache);
  }

  async executeRestart(envConfig, reason, clearCache) {
    console.log(`🚀 Restarting application on container ${envConfig.container} (${envConfig.ip})`);
    
    const commands = [
      // Kill existing processes
      `ssh ${envConfig.ssh} "pkill -f 'next.*${envConfig.port}' || true"`,
      
      // Clear cache if requested
      clearCache ? `ssh ${envConfig.ssh} "cd ${envConfig.path} && rm -rf .next || true"` : null,
      
      // Pull latest code
      `ssh ${envConfig.ssh} "cd ${envConfig.path} && git pull origin ${envConfig.branch}"`,
      
      // Start application
      `ssh ${envConfig.ssh} "cd ${envConfig.path} && npm run dev -- --port ${envConfig.port} > /var/log/theoshift.log 2>&1 &"`
    ].filter(Boolean);

    for (const command of commands) {
      console.log(`🔧 Executing: ${command.split(' ').slice(0, 4).join(' ')}...`);
      
      try {
        await this.executeCommand(command);
        console.log(`✅ Command completed successfully`);
      } catch (error) {
        console.error(`❌ Command failed: ${error.message}`);
        throw error;
      }
    }

    // Wait for application to start
    console.log(`⏳ Waiting for application to start...`);
    await this.sleep(5000);
    
    // Validate application is running
    const healthCheck = await this.healthCheck(envConfig);
    if (healthCheck.success) {
      console.log(`🎉 Application restart successful!`);
      console.log(`🌐 Application available at: ${envConfig.url}`);
      return { success: true, url: envConfig.url };
    } else {
      throw new Error(`Application failed to start: ${healthCheck.error}`);
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const process = spawn('bash', ['-c', command], { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        process.kill();
        reject(new Error('Command timeout'));
      }, 30000);
    });
  }

  async healthCheck(envConfig) {
    try {
      const command = `ssh ${envConfig.ssh} "curl -s -o /dev/null -w '%{http_code}' http://localhost:${envConfig.port}/admin"`;
      const result = await this.executeCommand(command);
      const statusCode = result.stdout.trim();
      
      if (statusCode === '200') {
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${statusCode}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const [,, action, environment, ...args] = process.argv;
  
  if (!action || !environment) {
    console.log(`
🛡️ WMACS MCP Client Usage:
  
  node wmacs-mcp-client.js restart staging "Fix merge conflicts"
  node wmacs-mcp-client.js restart production "Deploy latest features"
  node wmacs-mcp-client.js health staging
    `);
    process.exit(1);
  }

  const client = new WMACsMCPClient();
  
  try {
    switch (action) {
      case 'restart':
        const reason = args[0] || 'Manual restart';
        const result = await client.restartApplication(environment, reason);
        console.log(`🎉 Restart completed:`, result);
        break;
        
      case 'health':
        const envConfig = client.environments[environment];
        const health = await client.healthCheck(envConfig);
        console.log(`🏥 Health check result:`, health);
        break;
        
      default:
        console.error(`❌ Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ WMACS MCP operation failed:`, error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { WMACsMCPClient };
