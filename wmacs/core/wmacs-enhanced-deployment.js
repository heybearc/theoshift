#!/usr/bin/env node

/**
 * WMACS Enhanced Deployment Tool
 * Implements WMACS deployment standards with repository verification
 * Standardized for use across all WMACS repositories
 */

const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

class WMACSEnhancedDeployment {
  constructor(projectPath = '.') {
    this.projectPath = projectPath;
    this.loadConfiguration();
    this.deploymentLog = [];
  }

  loadConfiguration() {
    try {
      this.config = JSON.parse(fs.readFileSync(`${this.projectPath}/wmacs/config/project.json`, 'utf8'));
      this.environments = JSON.parse(fs.readFileSync(`${this.projectPath}/wmacs/config/environments.json`, 'utf8'));
    } catch (error) {
      throw new Error(`WMACS configuration not found. Ensure wmacs/config/ directory exists with project.json and environments.json`);
    }
  }

  async deployToEnvironment(environment, options = {}) {
    const startTime = Date.now();
    this.log(`🛡️ WMACS Enhanced Deployment: ${environment.toUpperCase()}`);
    this.log(`📋 Reason: ${options.reason || 'Standard deployment'}`);
    this.log(`🎯 Following WMACS Deployment Standards v1.0`);
    
    const envConfig = this.environments[environment];
    if (!envConfig) {
      throw new Error(`Environment '${environment}' not found in configuration`);
    }

    try {
      // Phase 1: Pre-Deployment Verification (WMACS-DEPLOY-001)
      await this.preDeploymentVerification();
      
      // Phase 2: Repository Synchronization (WMACS-DEPLOY-002)
      await this.repositorySynchronization(envConfig, options.forcSync || false);
      
      // Phase 3: Application Deployment (WMACS-DEPLOY-003)
      await this.applicationDeployment(envConfig, options);
      
      // Phase 4: Post-Deployment Validation (WMACS-DEPLOY-004)
      const validation = await this.postDeploymentValidation(envConfig);
      
      const duration = Date.now() - startTime;
      this.log(`🎉 WMACS Deployment: SUCCESS (${duration}ms)`);
      this.log(`🌐 Application: ${envConfig.url}`);
      
      return {
        success: true,
        environment,
        duration,
        validation,
        deploymentLog: this.deploymentLog
      };
      
    } catch (error) {
      this.log(`❌ WMACS Deployment: FAILED - ${error.message}`);
      
      // Attempt automatic rollback if enabled
      if (options.autoRollback) {
        await this.attemptRollback(envConfig);
      }
      
      throw error;
    }
  }

  async preDeploymentVerification() {
    this.log(`🔍 Phase 1: Pre-Deployment Verification`);
    
    // Verify local repository state
    const status = await this.executeCommand('git status --porcelain');
    if (status.stdout.trim()) {
      this.log(`⚠️  Warning: Uncommitted changes detected`);
      if (status.stdout.includes('??')) {
        this.log(`📋 Untracked files present`);
      }
    }
    
    // Get local commit information
    const localCommit = await this.executeCommand('git rev-parse HEAD');
    const localBranch = await this.executeCommand('git branch --show-current');
    
    this.localState = {
      commit: localCommit.stdout.trim(),
      branch: localBranch.stdout.trim(),
      hasChanges: !!status.stdout.trim()
    };
    
    this.log(`📊 Local State: ${this.localState.branch}@${this.localState.commit.substring(0, 8)}`);
    this.log(`✅ Pre-deployment verification complete`);
  }

  async repositorySynchronization(envConfig, forceSync = false) {
    this.log(`🔄 Phase 2: Repository Synchronization`);
    this.log(`🎯 Target: Container ${envConfig.container} (${envConfig.ip})`);
    
    // Get current container state
    const containerCommit = await this.executeCommand(
      `ssh ${envConfig.ssh} "cd ${envConfig.path} && git rev-parse HEAD"`
    );
    
    const containerState = {
      commit: containerCommit.stdout.trim()
    };
    
    this.log(`📊 Container State: ${containerState.commit.substring(0, 8)}`);
    this.log(`📊 Local State: ${this.localState.commit.substring(0, 8)}`);
    
    // Check if synchronization is needed
    const needsSync = containerState.commit !== this.localState.commit;
    
    if (needsSync || forceSync) {
      this.log(`🔧 Repository synchronization required`);
      
      // WMACS-DEPLOY-003: Forced Synchronization Protocol
      await this.executeCommand(
        `ssh ${envConfig.ssh} "cd ${envConfig.path} && git fetch origin --force"`
      );
      
      await this.executeCommand(
        `ssh ${envConfig.ssh} "cd ${envConfig.path} && git reset --hard origin/${this.localState.branch}"`
      );
      
      // Verify synchronization (WMACS-DEPLOY-002)
      const verifyCommit = await this.executeCommand(
        `ssh ${envConfig.ssh} "cd ${envConfig.path} && git rev-parse HEAD"`
      );
      
      if (verifyCommit.stdout.trim() !== this.localState.commit) {
        throw new Error(`Repository synchronization failed: ${verifyCommit.stdout.trim()} !== ${this.localState.commit}`);
      }
      
      this.log(`✅ Repository synchronized successfully`);
    } else {
      this.log(`✅ Repository already synchronized`);
    }
    
    // Critical file validation
    await this.validateCriticalFiles(envConfig);
  }

  async validateCriticalFiles(envConfig) {
    this.log(`🔍 Validating critical files`);
    
    const criticalFiles = [
      'src/app/layout.tsx',
      'src/app/admin/page.tsx',
      'package.json'
    ];
    
    for (const file of criticalFiles) {
      try {
        const localHash = await this.getFileHash(file);
        const containerHash = await this.executeCommand(
          `ssh ${envConfig.ssh} "cd ${envConfig.path} && md5sum ${file} | cut -d' ' -f1"`
        );
        
        if (localHash !== containerHash.stdout.trim()) {
          throw new Error(`File integrity check failed for ${file}: ${localHash} !== ${containerHash.stdout.trim()}`);
        }
        
        this.log(`✅ ${file}: integrity verified`);
      } catch (error) {
        this.log(`⚠️  ${file}: ${error.message}`);
      }
    }
  }

  async applicationDeployment(envConfig, options) {
    this.log(`🚀 Phase 3: Application Deployment`);
    
    // Stop existing processes
    this.log(`🔧 Stopping existing processes`);
    await this.executeCommand(
      `ssh ${envConfig.ssh} "pkill -f '${envConfig.processPattern || 'next.*' + envConfig.port}' || true"`
    );
    
    // Clear caches if requested
    if (options.clearCache !== false) {
      this.log(`🧹 Clearing application cache`);
      await this.executeCommand(
        `ssh ${envConfig.ssh} "cd ${envConfig.path} && rm -rf .next node_modules/.cache || true"`
      );
    }
    
    // Start application
    this.log(`🚀 Starting application`);
    const startCommand = `ssh ${envConfig.ssh} "cd ${envConfig.path} && nohup npm run dev -- --port ${envConfig.port} > /var/log/${this.config.name}.log 2>&1 & echo $!"`;
    
    const startResult = await this.executeCommand(startCommand);
    if (startResult.stdout.trim()) {
      this.log(`✅ Application started with PID: ${startResult.stdout.trim()}`);
    }
    
    // Wait for startup
    this.log(`⏳ Waiting for application startup...`);
    await this.sleep(options.startupDelay || 8000);
  }

  async postDeploymentValidation(envConfig) {
    this.log(`🏥 Phase 4: Post-Deployment Validation`);
    
    const endpoints = [
      { name: 'Health Check', url: '/admin', expectedStatus: '200' },
      { name: 'API Status', url: '/api/admin/users', expectedStatus: '200' },
      { name: 'Dashboard', url: '/dashboard', expectedStatus: '200' }
    ];
    
    const results = [];
    let healthyCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const result = await this.executeCommand(
          `ssh ${envConfig.ssh} "curl -s -o /dev/null -w '%{http_code}' http://localhost:${envConfig.port}${endpoint.url}"`
        );
        
        const status = result.stdout.trim();
        const isHealthy = status === endpoint.expectedStatus;
        
        if (isHealthy) healthyCount++;
        
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          status,
          healthy: isHealthy
        });
        
        this.log(`${isHealthy ? '✅' : '❌'} ${endpoint.name}: ${status}`);
        
      } catch (error) {
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          status: 'ERROR',
          healthy: false,
          error: error.message
        });
        this.log(`💥 ${endpoint.name}: ERROR - ${error.message}`);
      }
    }
    
    const validationSuccess = healthyCount >= Math.ceil(endpoints.length * 0.75); // 75% threshold
    
    if (!validationSuccess) {
      throw new Error(`Post-deployment validation failed: ${healthyCount}/${endpoints.length} endpoints healthy`);
    }
    
    this.log(`✅ Post-deployment validation: ${healthyCount}/${endpoints.length} endpoints healthy`);
    
    return {
      success: validationSuccess,
      healthyEndpoints: healthyCount,
      totalEndpoints: endpoints.length,
      results
    };
  }

  async attemptRollback(envConfig) {
    this.log(`🚨 Attempting automatic rollback`);
    
    try {
      // Get previous commit
      const previousCommit = await this.executeCommand(
        `ssh ${envConfig.ssh} "cd ${envConfig.path} && git rev-parse HEAD~1"`
      );
      
      // Rollback to previous commit
      await this.executeCommand(
        `ssh ${envConfig.ssh} "cd ${envConfig.path} && git reset --hard ${previousCommit.stdout.trim()}"`
      );
      
      // Restart application
      await this.applicationDeployment(envConfig, { clearCache: true });
      
      this.log(`✅ Rollback completed successfully`);
      
    } catch (rollbackError) {
      this.log(`❌ Rollback failed: ${rollbackError.message}`);
      throw new Error(`Deployment failed and rollback failed: ${rollbackError.message}`);
    }
  }

  async getFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const process = spawn('bash', ['-c', command], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60000 
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

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.deploymentLog.push(logEntry);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const [,, environment, ...args] = process.argv;
  
  if (!environment) {
    console.log(`
🛡️ WMACS Enhanced Deployment Tool v1.0

Usage:
  node wmacs-enhanced-deployment.js <environment> [options]

Environments:
  staging     Deploy to staging environment
  production  Deploy to production environment

Options:
  --reason "message"     Deployment reason
  --force-sync          Force repository synchronization
  --no-cache            Skip cache clearing
  --auto-rollback       Enable automatic rollback on failure

Examples:
  node wmacs-enhanced-deployment.js staging --reason "Deploy navigation fix"
  node wmacs-enhanced-deployment.js production --force-sync --auto-rollback
    `);
    process.exit(1);
  }

  const options = {
    reason: args.find(arg => arg.startsWith('--reason'))?.split('=')[1] || 'WMACS Enhanced Deployment',
    forceSync: args.includes('--force-sync'),
    clearCache: !args.includes('--no-cache'),
    autoRollback: args.includes('--auto-rollback')
  };

  const deployment = new WMACSEnhancedDeployment();
  
  try {
    const result = await deployment.deployToEnvironment(environment, options);
    
    console.log('\\n🎉 DEPLOYMENT SUCCESSFUL');
    console.log(`🌐 Environment: ${environment}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`📊 Health: ${result.validation.healthyEndpoints}/${result.validation.totalEndpoints} endpoints`);
    
    process.exit(0);
  } catch (error) {
    console.error('\\n❌ DEPLOYMENT FAILED');
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { WMACSEnhancedDeployment };
