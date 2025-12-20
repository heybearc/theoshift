#!/usr/bin/env node

/**
 * WMACS MCP Restart Operation
 * Uses MCP server for safe application restart with proper guardrails
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WMACsMCPRestart {
  constructor() {
    // Load WMACS configuration
    this.config = JSON.parse(fs.readFileSync('./wmacs/config/project.json', 'utf8'));
    this.environments = JSON.parse(fs.readFileSync('./wmacs/config/environments.json', 'utf8'));
  }

  async restartStaging(reason) {
    console.log('🛡️ WMACS MCP: Starting staging application restart');
    console.log(`📋 Reason: ${reason}`);
    
    const stagingEnv = this.environments.staging;
    console.log(`🎯 Target: Container ${stagingEnv.container} (${stagingEnv.ip}:${stagingEnv.port})`);

    try {
      // Step 1: Kill existing processes using MCP-safe operations
      console.log('🔧 Step 1: Stopping existing processes...');
      await this.executeOperation(`ssh ${stagingEnv.ssh} "pkill -f 'next.*${stagingEnv.port}' || true"`);
      
      // Step 2: Clear cache for clean start
      console.log('🧹 Step 2: Clearing application cache...');
      await this.executeOperation(`ssh ${stagingEnv.ssh} "cd ${stagingEnv.path} && rm -rf .next || true"`);
      
      // Step 3: Start application with proper environment
      console.log('🚀 Step 3: Starting application...');
      const startCommand = `ssh ${stagingEnv.ssh} "cd ${stagingEnv.path} && nohup npm run dev -- --port ${stagingEnv.port} > /var/log/theoshift.log 2>&1 & echo $!"`;
      const result = await this.executeOperation(startCommand);
      
      if (result.stdout) {
        const pid = result.stdout.trim();
        console.log(`✅ Application started with PID: ${pid}`);
      }
      
      // Step 4: Wait for startup
      console.log('⏳ Step 4: Waiting for application startup...');
      await this.sleep(8000);
      
      // Step 5: Health check
      console.log('🏥 Step 5: Performing health check...');
      const healthResult = await this.healthCheck(stagingEnv);
      
      if (healthResult.success) {
        console.log('🎉 WMACS MCP Restart: SUCCESS');
        console.log(`🌐 Application available at: ${stagingEnv.url}`);
        console.log(`📊 Admin panel: ${stagingEnv.url}/admin`);
        return { success: true, url: stagingEnv.url };
      } else {
        throw new Error(`Health check failed: ${healthResult.error}`);
      }
      
    } catch (error) {
      console.error('❌ WMACS MCP Restart: FAILED');
      console.error(`💥 Error: ${error.message}`);
      throw error;
    }
  }

  async executeOperation(command) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Executing: ${command.substring(0, 50)}...`);
      
      const process = spawn('bash', ['-c', command], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000 
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
        // SSH warnings about host keys are not actual errors
        const isSSHWarning = stderr.includes('Warning: Permanently added') && stderr.trim().split('\n').length === 1;
        
        if (code === 0 || code === null || (code === 255 && isSSHWarning)) {
          console.log('✅ Operation completed');
          resolve({ stdout, stderr, code });
        } else {
          console.error(`❌ Operation failed with code ${code}`);
          if (stderr && !isSSHWarning) console.error(`Error output: ${stderr}`);
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        console.error(`❌ Process error: ${error.message}`);
        reject(error);
      });
    });
  }

  async healthCheck(envConfig) {
    try {
      console.log('🔍 Checking application health...');
      
      // Check if process is running
      const psResult = await this.executeOperation(
        `ssh ${envConfig.ssh} "ps aux | grep 'next.*${envConfig.port}' | grep -v grep || echo 'NO_PROCESS'"`
      );
      
      if (psResult.stdout.includes('NO_PROCESS')) {
        return { success: false, error: 'Application process not running' };
      }
      
      // Check HTTP response
      const httpResult = await this.executeOperation(
        `ssh ${envConfig.ssh} "curl -s -o /dev/null -w '%{http_code}' http://localhost:${envConfig.port}/admin"`
      );
      
      const statusCode = httpResult.stdout.trim();
      console.log(`📡 HTTP Status: ${statusCode}`);
      
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

// CLI execution
async function main() {
  const reason = process.argv[2] || 'WMACS MCP restart operation';
  
  console.log('🛡️ WMACS MCP Restart Tool');
  console.log('==========================');
  
  const restarter = new WMACsMCPRestart();
  
  try {
    const result = await restarter.restartStaging(reason);
    console.log('\n🎉 RESTART SUCCESSFUL');
    console.log(`🌐 Application URL: ${result.url}`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RESTART FAILED');
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { WMACsMCPRestart };
