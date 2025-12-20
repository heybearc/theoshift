#!/usr/bin/env node

/**
 * WMACS MCP Recovery Operation
 * Uses proper MCP server for complete application recovery
 */

const { spawn } = require('child_process');
const fs = require('fs');

class WMACsMCPRecovery {
  constructor() {
    this.config = JSON.parse(fs.readFileSync('./wmacs/config/project.json', 'utf8'));
    this.environments = JSON.parse(fs.readFileSync('./wmacs/config/environments.json', 'utf8'));
  }

  async performCompleteRecovery() {
    console.log('🛡️ WMACS MCP: Starting complete application recovery');
    console.log('================================================');
    
    const stagingEnv = this.environments.staging;
    console.log(`🎯 Target: Container ${stagingEnv.container} (${stagingEnv.ip}:${stagingEnv.port})`);

    try {
      // Step 1: Force kill all processes
      console.log('🔧 Step 1: Force terminating all Next.js processes...');
      await this.mcpOperation('kill_processes', {
        environment: 'staging',
        processPattern: 'next',
        force: true
      });
      
      // Step 2: Clean all caches and build artifacts
      console.log('🧹 Step 2: Cleaning all caches and build artifacts...');
      await this.mcpOperation('clean_build', {
        environment: 'staging',
        cleanCache: true,
        cleanNodeModules: false,
        cleanNext: true
      });
      
      // Step 3: Pull latest code
      console.log('📥 Step 3: Pulling latest code from repository...');
      await this.mcpOperation('update_code', {
        environment: 'staging',
        branch: 'staging',
        force: true
      });
      
      // Step 4: Start application with clean state
      console.log('🚀 Step 4: Starting application with clean state...');
      await this.mcpOperation('start_application', {
        environment: 'staging',
        port: stagingEnv.port,
        cleanStart: true
      });
      
      // Step 5: Wait for startup
      console.log('⏳ Step 5: Waiting for application startup...');
      await this.sleep(12000);
      
      // Step 6: Comprehensive health check
      console.log('🏥 Step 6: Running comprehensive health check...');
      const healthResult = await this.comprehensiveHealthCheck(stagingEnv);
      
      if (healthResult.success) {
        console.log('🎉 WMACS MCP Recovery: SUCCESS');
        console.log(`🌐 Application available at: ${stagingEnv.url}`);
        console.log(`📊 Admin panel: ${stagingEnv.url}/admin`);
        console.log(`✅ Healthy endpoints: ${healthResult.healthy}/${healthResult.total}`);
        return { success: true, url: stagingEnv.url, health: healthResult };
      } else {
        throw new Error(`Recovery validation failed: ${healthResult.error}`);
      }
      
    } catch (error) {
      console.error('❌ WMACS MCP Recovery: FAILED');
      console.error(`💥 Error: ${error.message}`);
      
      // Emergency fallback
      console.log('🚨 Attempting emergency fallback...');
      await this.emergencyFallback(stagingEnv);
      throw error;
    }
  }

  async mcpOperation(operation, params) {
    console.log(`🔧 MCP Operation: ${operation}`);
    
    // For now, translate MCP operations to safe commands
    switch (operation) {
      case 'kill_processes':
        return this.executeCommand(
          `ssh ${params.environment === 'staging' ? 'root@10.92.3.24' : 'root@10.92.3.22'} "pkill -9 -f ${params.processPattern} || true"`
        );
        
      case 'clean_build':
        const cleanCommands = [];
        if (params.cleanNext) cleanCommands.push('rm -rf .next');
        if (params.cleanCache) cleanCommands.push('rm -rf node_modules/.cache');
        
        return this.executeCommand(
          `ssh ${params.environment === 'staging' ? 'root@10.92.3.24' : 'root@10.92.3.22'} "cd /opt/theoshift && ${cleanCommands.join(' && ')}"`
        );
        
      case 'update_code':
        return this.executeCommand(
          `ssh ${params.environment === 'staging' ? 'root@10.92.3.24' : 'root@10.92.3.22'} "cd /opt/theoshift && git pull origin ${params.branch}"`
        );
        
      case 'start_application':
        return this.executeCommand(
          `ssh ${params.environment === 'staging' ? 'root@10.92.3.24' : 'root@10.92.3.22'} "cd /opt/theoshift && nohup npm run dev -- --port ${params.port} > /var/log/theoshift.log 2>&1 & echo $!"`
        );
        
      default:
        throw new Error(`Unknown MCP operation: ${operation}`);
    }
  }

  async comprehensiveHealthCheck(envConfig) {
    const endpoints = [
      { name: 'Admin Panel', url: '/admin' },
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Signin', url: '/auth/signin' },
      { name: 'Users API', url: '/api/admin/users' }
    ];

    let healthy = 0;
    const results = [];

    for (const endpoint of endpoints) {
      try {
        const result = await this.executeCommand(
          `ssh ${envConfig.ssh} "curl -s -o /dev/null -w '%{http_code}' http://localhost:${envConfig.port}${endpoint.url}"`
        );
        
        const status = result.stdout.trim();
        const isHealthy = status === '200';
        
        if (isHealthy) healthy++;
        
        results.push({
          name: endpoint.name,
          status,
          healthy: isHealthy
        });
        
        console.log(`   ${isHealthy ? '✅' : '❌'} ${endpoint.name}: ${status}`);
        
      } catch (error) {
        results.push({
          name: endpoint.name,
          status: 'ERROR',
          healthy: false,
          error: error.message
        });
        console.log(`   💥 ${endpoint.name}: ERROR`);
      }
    }

    return {
      success: healthy >= 3, // At least 3 out of 4 endpoints must be healthy
      healthy,
      total: endpoints.length,
      results,
      error: healthy < 3 ? `Only ${healthy}/${endpoints.length} endpoints healthy` : null
    };
  }

  async emergencyFallback(envConfig) {
    console.log('🚨 Emergency fallback: Attempting basic restart...');
    try {
      await this.executeCommand(
        `ssh ${envConfig.ssh} "cd /opt/theoshift && pkill -f next; sleep 2; npm run dev -- --port ${envConfig.port} > /var/log/emergency.log 2>&1 &"`
      );
      console.log('✅ Emergency fallback completed');
    } catch (error) {
      console.error('❌ Emergency fallback failed:', error.message);
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const process = spawn('bash', ['-c', command], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 45000 
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        const isSSHWarning = stderr.includes('Warning: Permanently added') && stderr.trim().split('\\n').length <= 2;
        
        if (code === 0 || code === null || (code === 255 && isSSHWarning)) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
async function main() {
  console.log('🛡️ WMACS MCP Complete Recovery Tool');
  console.log('===================================');
  
  const recovery = new WMACsMCPRecovery();
  
  try {
    const result = await recovery.performCompleteRecovery();
    console.log('\\n🎉 RECOVERY SUCCESSFUL');
    console.log(`🌐 Application URL: ${result.url}`);
    console.log(`📊 Health Status: ${result.health.healthy}/${result.health.total} endpoints healthy`);
    process.exit(0);
  } catch (error) {
    console.error('\\n❌ RECOVERY FAILED');
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { WMACsMCPRecovery };
