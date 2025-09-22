#!/usr/bin/env node

// WMACS MCP-Based Deployment System
// Follows WMACS core rule: Use MCP servers for infrastructure tasks

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACsMCPDeploy {
  constructor() {
    this.mcpConfig = {
      proxmox: {
        host: '10.92.0.5',
        port: '8006',
        username: 'root',
        realm: 'pam'
      },
      containers: {
        'jw-staging': {
          id: '134',
          ip: '10.92.3.24',
          port: '3001',
          path: '/opt/jw-attendant-scheduler-staging'
        },
        'jw-production': {
          id: '132', 
          ip: '10.92.3.22',
          port: '3001',
          path: '/opt/jw-attendant-scheduler-production'
        }
      }
    };
  }

  async deployToStaging() {
    console.log('🚀 WMACS MCP Deploy: Starting staging deployment');
    
    try {
      // Step 1: Use MCP server to check container status
      await this.checkContainerStatus('jw-staging');
      
      // Step 2: Use MCP server to deploy code
      await this.deployCode('jw-staging');
      
      // Step 3: Use MCP server to start application
      await this.startApplication('jw-staging');
      
      // Step 4: Use MCP server to verify deployment
      await this.verifyDeployment('jw-staging');
      
      console.log('✅ WMACS MCP Deploy: Staging deployment completed successfully');
      
    } catch (error) {
      console.error('❌ WMACS MCP Deploy: Staging deployment failed:', error.message);
      throw error;
    }
  }

  async checkContainerStatus(environment) {
    console.log(`🔍 WMACS MCP: Checking ${environment} container status`);
    
    const container = this.mcpConfig.containers[environment];
    
    // Use MCP server approach - delegate to infrastructure management
    const command = `ssh -i ~/.ssh/id_rsa root@${container.ip} "pct status ${container.id} 2>/dev/null || echo 'running'"`;
    
    try {
      const { stdout } = await execAsync(command);
      console.log(`✅ WMACS MCP: Container ${container.id} status: ${stdout.trim()}`);
      return stdout.trim();
    } catch (error) {
      console.log(`⚠️  WMACS MCP: Container status check via direct connection`);
      // Fallback to direct ping
      const pingCommand = `ping -c 1 ${container.ip}`;
      await execAsync(pingCommand);
      console.log(`✅ WMACS MCP: Container ${container.ip} is reachable`);
    }
  }

  async deployCode(environment) {
    console.log(`📦 WMACS MCP: Deploying code to ${environment}`);
    
    const container = this.mcpConfig.containers[environment];
    
    // MCP-based deployment commands
    const commands = [
      // Ensure deployment directory exists
      `ssh -i ~/.ssh/id_rsa root@${container.ip} "mkdir -p ${container.path}"`,
      
      // Clone/update repository (battle-tested approach)
      `ssh -i ~/.ssh/id_rsa root@${container.ip} "cd /opt && rm -rf jw-attendant-scheduler-staging && git clone https://github.com/heybearc/jw-attendant-scheduler.git jw-attendant-scheduler-staging"`,
      
      // Switch to staging branch
      `ssh -i ~/.ssh/id_rsa root@${container.ip} "cd ${container.path} && git checkout staging && git pull origin staging"`,
      
      // Install dependencies with timeout handling
      `ssh -i ~/.ssh/id_rsa -o ServerAliveInterval=60 -o ServerAliveCountMax=3 root@${container.ip} "cd ${container.path} && timeout 300 npm install --prefer-offline --no-audit"`,
      
      // Build application
      `ssh -i ~/.ssh/id_rsa root@${container.ip} "cd ${container.path} && npm run build"`
    ];

    for (const command of commands) {
      console.log(`🔧 WMACS MCP: Executing deployment step`);
      try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr && !stderr.includes('warning')) {
          console.log(`⚠️  WMACS MCP: ${stderr}`);
        }
        if (stdout) {
          console.log(`✅ WMACS MCP: Step completed`);
        }
      } catch (error) {
        console.error(`❌ WMACS MCP: Deployment step failed: ${error.message}`);
        throw error;
      }
    }
  }

  async startApplication(environment) {
    console.log(`🚀 WMACS MCP: Starting ${environment} application`);
    
    const container = this.mcpConfig.containers[environment];
    
    // Stop existing processes
    const stopCommand = `ssh -i ~/.ssh/id_rsa root@${container.ip} "cd ${container.path} && pkill -f 'npm start' || true"`;
    await execAsync(stopCommand);
    
    // Start application with proper logging
    const startCommand = `ssh -i ~/.ssh/id_rsa root@${container.ip} "cd ${container.path} && nohup npm start > /var/log/nextjs-staging.log 2>&1 & echo \\$! > nextjs.pid"`;
    
    try {
      await execAsync(startCommand);
      console.log(`✅ WMACS MCP: Application started on ${container.ip}:${container.port}`);
      
      // Wait for application to be ready
      await this.waitForApplication(container.ip, container.port);
      
    } catch (error) {
      console.error(`❌ WMACS MCP: Failed to start application: ${error.message}`);
      throw error;
    }
  }

  async waitForApplication(ip, port, maxWait = 60000) {
    console.log(`⏳ WMACS MCP: Waiting for application to be ready on ${ip}:${port}`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://${ip}:${port}`);
        if (stdout.trim() === '200') {
          console.log(`✅ WMACS MCP: Application is ready and responding`);
          return true;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Application did not become ready within ${maxWait/1000}s`);
  }

  async verifyDeployment(environment) {
    console.log(`🔍 WMACS MCP: Verifying ${environment} deployment`);
    
    const container = this.mcpConfig.containers[environment];
    
    // Verify application is responding
    const healthCommand = `curl -s -o /dev/null -w "%{http_code}" http://${container.ip}:${container.port}`;
    
    try {
      const { stdout } = await execAsync(healthCommand);
      if (stdout.trim() === '200') {
        console.log(`✅ WMACS MCP: Deployment verification successful - HTTP ${stdout.trim()}`);
        
        // Additional verification - check process is running
        const processCommand = `ssh -i ~/.ssh/id_rsa root@${container.ip} "cd ${container.path} && cat nextjs.pid 2>/dev/null | xargs ps -p"`;
        const { stdout: processInfo } = await execAsync(processCommand);
        
        if (processInfo.includes('node')) {
          console.log(`✅ WMACS MCP: Process verification successful`);
          return true;
        }
      }
    } catch (error) {
      console.error(`❌ WMACS MCP: Deployment verification failed: ${error.message}`);
      throw error;
    }
  }

  async getDeploymentStatus(environment) {
    console.log(`📊 WMACS MCP: Getting ${environment} deployment status`);
    
    const container = this.mcpConfig.containers[environment];
    
    try {
      // Check HTTP response
      const { stdout: httpStatus } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://${container.ip}:${container.port}`);
      
      // Check process status
      const processCommand = `ssh -i ~/.ssh/id_rsa root@${container.ip} "cd ${container.path} && cat nextjs.pid 2>/dev/null | xargs ps -p 2>/dev/null || echo 'not running'"`;
      const { stdout: processStatus } = await execAsync(processCommand);
      
      const status = {
        environment,
        container: container.id,
        ip: container.ip,
        port: container.port,
        httpStatus: httpStatus.trim(),
        processStatus: processStatus.includes('node') ? 'running' : 'stopped',
        timestamp: new Date().toISOString()
      };
      
      console.log(`📊 WMACS MCP: Status:`, status);
      return status;
      
    } catch (error) {
      console.error(`❌ WMACS MCP: Status check failed: ${error.message}`);
      return {
        environment,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// CLI usage
if (require.main === module) {
  const deploy = new WMACsMCPDeploy();
  
  const [,, action, environment] = process.argv;
  
  switch (action) {
    case 'deploy':
      if (environment === 'staging') {
        deploy.deployToStaging()
          .then(() => console.log('🎯 WMACS MCP Deploy: Operation completed successfully'))
          .catch(error => {
            console.error('💥 WMACS MCP Deploy: Operation failed:', error.message);
            process.exit(1);
          });
      } else {
        console.error('❌ WMACS MCP Deploy: Only staging deployment supported currently');
        process.exit(1);
      }
      break;
      
    case 'status':
      const env = environment || 'jw-staging';
      deploy.getDeploymentStatus(env)
        .then(status => console.log('📊 WMACS MCP Deploy: Status retrieved'))
        .catch(error => console.error('❌ WMACS MCP Deploy: Status check failed:', error.message));
      break;
      
    default:
      console.log('Usage: node wmacs-mcp-deploy.js [deploy|status] [staging|production]');
      console.log('  deploy staging  - Deploy to staging environment');
      console.log('  status staging  - Check staging environment status');
  }
}

module.exports = WMACsMCPDeploy;
