#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class APEXStagingToProduction {
  constructor() {
    this.config = JSON.parse(fs.readFileSync('wmacs/config/project.json', 'utf8'));
    this.environments = JSON.parse(fs.readFileSync('wmacs/config/environments.json', 'utf8'));
    this.rules = JSON.parse(fs.readFileSync('wmacs/config/deployment-rules.json', 'utf8'));
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async runCommand(command, cwd = '.') {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', command], { cwd, stdio: 'inherit' });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${command}`));
        }
      });
    });
  }

  async deployToProduction() {
    this.log('🛡️ APEX Guardian: Staging → Production Deployment');
    this.log('================================================');

    try {
      // Phase 1: Validation
      this.log('📋 Phase 1: Validating staging environment...');
      await this.validateStaging();

      // Phase 2: Backup production
      this.log('💾 Phase 2: Creating production backup...');
      await this.backupProduction();

      // Phase 3: Sync staging to production
      this.log('🔄 Phase 3: Syncing staging to production...');
      await this.syncStagingToProduction();

      // Phase 4: Update environment references
      this.log('🔧 Phase 4: Updating production environment...');
      await this.updateProductionEnvironment();

      // Phase 5: Deploy and restart
      this.log('🚀 Phase 5: Deploying and restarting...');
      await this.deployAndRestart();

      // Phase 6: Validation
      this.log('✅ Phase 6: Validating production deployment...');
      await this.validateProduction();

      this.log('🎉 APEX Guardian: Deployment completed successfully!');
      this.log('Production URL: https://theoshift.com');

    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`);
      process.exit(1);
    }
  }

  async validateStaging() {
    const staging = this.environments.staging;
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${staging.server} "curl -f ${staging.url} > /dev/null"`);
  }

  async backupProduction() {
    const prod = this.environments.production;
    const backupDir = `/opt/backups/theoshift-green-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}`;
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "mkdir -p ${backupDir} && cp -r ${prod.path}/* ${backupDir}/ 2>/dev/null || true"`);
  }

  async syncStagingToProduction() {
    const staging = this.environments.staging;
    const prod = this.environments.production;
    
    // Use the stable deployment script we know works
    await this.runCommand('./deploy-production-stable.sh');
  }

  async updateProductionEnvironment() {
    const prod = this.environments.production;
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} 'cd ${prod.path} && cat > .env << "EOF"
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL="postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/theoshift_scheduler_staging"
NEXTAUTH_URL="https://theoshift.com"
NEXTAUTH_SECRET="prod-secret-$(date +%s)"
UPLOAD_DIR="/opt/theoshift/public/uploads"
MAX_FILE_SIZE=10485760
FEEDBACK_ENABLED=true
EOF'`);
  }

  async deployAndRestart() {
    const prod = this.environments.production;
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "cd ${prod.path} && pm2 restart theoshift-green"`);
  }

  async validateProduction() {
    const prod = this.environments.production;
    await this.runCommand(`ssh -F /Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant ${prod.server} "curl -f http://localhost:3001 > /dev/null 2>&1"`);
  }
}

// Run deployment
const deployer = new APEXStagingToProduction();
deployer.deployToProduction().catch(console.error);
