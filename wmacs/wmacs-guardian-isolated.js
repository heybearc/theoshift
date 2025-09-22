#!/usr/bin/env node

/**
 * WMACS Guardian - Repository-Isolated Implementation
 * Completely self-contained with NO global dependencies
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class WMACSGuardianIsolated {
  constructor() {
    this.projectRoot = process.cwd();
    this.configPath = path.join(this.projectRoot, '.wmacs/config/wmacs-config.json');
    this.config = null;
  }

  async init() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log(`[WMACS] Repository-isolated guardian for: ${this.config.project.name}`);
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  async log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    // Log to repository-local file
    const logFile = path.join(this.projectRoot, '.wmacs/logs', `wmacs-${new Date().toISOString().split('T')[0]}.log`);
    await fs.mkdir(path.dirname(logFile), { recursive: true }).catch(() => {});
    await fs.appendFile(logFile, `${timestamp} ${level}: ${message}\n`).catch(() => {});
  }

  async executeWithTimeout(command, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: ${command}`));
      }, timeoutMs);

      exec(command, (error, stdout, stderr) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
  }

  async healthCheck(environment) {
    const env = this.config.environments[environment];
    if (!env) throw new Error(`Environment ${environment} not configured`);

    try {
      const { stdout } = await this.executeWithTimeout(
        `curl -s -o /dev/null -w '%{http_code}' http://${env.host}:${env.port}`,
        10000
      );
      
      const statusCode = stdout.trim();
      const healthy = statusCode.startsWith('2') || statusCode.startsWith('3');
      
      await this.log('info', `Health check ${environment}: ${statusCode} ${healthy ? '✅' : '❌'}`);
      return healthy;
    } catch (error) {
      await this.log('error', `Health check failed ${environment}: ${error.message}`);
      return false;
    }
  }

  async deployToStaging() {
    await this.init();
    
    try {
      await this.log('info', 'Starting staging deployment...');
      
      // Build
      await this.log('info', 'Building application...');
      await this.executeWithTimeout(this.config.project.buildCommand, 300000);
      
      // Health check
      await this.healthCheck('staging');
      
      await this.log('info', 'Staging deployment completed');
      
    } catch (error) {
      await this.log('error', `Deployment failed: ${error.message}`);
      throw error;
    }
  }

  async status() {
    await this.init();
    
    console.log('\n🚨 WMACS GUARDIAN STATUS (Repository-Isolated)');
    console.log('===============================================');
    console.log(`Project: ${this.config.project.name}`);
    console.log(`Type: ${this.config.project.type}`);
    console.log(`Location: ${this.projectRoot}`);
    
    for (const [envName] of Object.entries(this.config.environments)) {
      const healthy = await this.healthCheck(envName);
      console.log(`${envName}: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const guardian = new WMACSGuardianIsolated();
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy-staging':
      guardian.deployToStaging().catch(console.error);
      break;
    case 'health-check':
      guardian.healthCheck(process.argv[3] || 'staging').then(result => {
        process.exit(result ? 0 : 1);
      }).catch(console.error);
      break;
    case 'status':
      guardian.status().catch(console.error);
      break;
    default:
      console.log('Usage: node wmacs-guardian-isolated.js [deploy-staging|health-check|status]');
  }
}

module.exports = { WMACSGuardianIsolated };
