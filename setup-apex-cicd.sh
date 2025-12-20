#!/bin/bash

# Setup APEX CI/CD System Properly
echo "🛡️ Setting Up APEX Guardian CI/CD System"
echo "========================================"

# Create WMACS configuration structure
echo "📁 Creating WMACS configuration structure..."
mkdir -p wmacs/config
mkdir -p wmacs/core

# Create project configuration
cat > wmacs/config/project.json << 'EOF'
{
  "name": "theoshift",
  "version": "2.1.2-integrated",
  "type": "nextjs",
  "framework": "next",
  "database": "postgresql",
  "deployment": {
    "strategy": "staging-first",
    "validation": true,
    "rollback": true
  },
  "features": [
    "feedback-system",
    "help-documentation", 
    "file-uploads",
    "user-comments",
    "admin-management"
  ]
}
EOF

# Create environments configuration
cat > wmacs/config/environments.json << 'EOF'
{
  "staging": {
    "name": "staging",
    "server": "jws",
    "host": "10.92.3.24",
    "port": 3001,
    "path": "/opt/theoshift",
    "url": "http://10.92.3.24:3001",
    "database": {
      "host": "10.92.3.21",
      "port": 5432,
      "database": "theoshift_scheduler_staging",
      "user": "jw_scheduler_staging"
    },
    "ssh_config": "/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"
  },
  "production": {
    "name": "production", 
    "server": "jwa",
    "host": "10.92.3.22",
    "port": 3001,
    "path": "/opt/theoshift",
    "url": "https://theoshift.com",
    "database": {
      "host": "10.92.3.21",
      "port": 5432,
      "database": "theoshift_scheduler_staging",
      "user": "jw_scheduler_staging"
    },
    "ssh_config": "/Users/cory/Documents/Cloudy-Work/ssh_config_jw_attendant"
  }
}
EOF

# Create deployment rules
cat > wmacs/config/deployment-rules.json << 'EOF'
{
  "rules": {
    "staging-to-production": {
      "enabled": true,
      "validation_required": true,
      "backup_required": true,
      "rollback_enabled": true
    },
    "environment_sync": {
      "sync_files": true,
      "sync_database": false,
      "sync_uploads": true
    },
    "reference_updates": {
      "staging_to_production_urls": true,
      "environment_variables": true
    }
  }
}
EOF

echo "✅ WMACS configuration created"

echo ""
echo "🔧 Creating APEX deployment script..."
cat > apex-deploy-staging-to-production.js << 'EOF'
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
      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, { cwd, stdio: 'inherit' });
      
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
    await this.runCommand(`ssh -F "${staging.ssh_config}" ${staging.server} "curl -f ${staging.url} > /dev/null"`);
  }

  async backupProduction() {
    const prod = this.environments.production;
    const backupDir = `/opt/backups/theoshift-green-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}`;
    await this.runCommand(`ssh -F "${prod.ssh_config}" ${prod.server} "mkdir -p ${backupDir} && cp -r ${prod.path}/* ${backupDir}/ || true"`);
  }

  async syncStagingToProduction() {
    const staging = this.environments.staging;
    const prod = this.environments.production;
    
    // Use the stable deployment script we know works
    await this.runCommand('./deploy-production-stable.sh');
  }

  async updateProductionEnvironment() {
    const prod = this.environments.production;
    const envContent = `
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DATABASE_URL="postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/theoshift_scheduler_staging"
NEXTAUTH_URL="https://theoshift.com"
NEXTAUTH_SECRET="prod-secret-$(date +%s)"
UPLOAD_DIR="/opt/theoshift/public/uploads"
MAX_FILE_SIZE=10485760
FEEDBACK_ENABLED=true
`;
    
    await this.runCommand(`ssh -F "${prod.ssh_config}" ${prod.server} "cd ${prod.path} && cat > .env << 'EOF'${envContent}EOF"`);
  }

  async deployAndRestart() {
    const prod = this.environments.production;
    await this.runCommand(`ssh -F "${prod.ssh_config}" ${prod.server} "cd ${prod.path} && pm2 restart theoshift-green"`);
  }

  async validateProduction() {
    const prod = this.environments.production;
    await this.runCommand(`ssh -F "${prod.ssh_config}" ${prod.server} "curl -f http://localhost:3001 > /dev/null"`);
  }
}

// Run deployment
const deployer = new APEXStagingToProduction();
deployer.deployToProduction().catch(console.error);
EOF

chmod +x apex-deploy-staging-to-production.js

echo "✅ APEX deployment script created"

echo ""
echo "🎯 APEX CI/CD System is now properly configured!"
echo ""
echo "To deploy from staging to production using APEX:"
echo "./apex-deploy-staging-to-production.js"
echo ""
echo "This will:"
echo "1. Validate staging environment"
echo "2. Backup production"
echo "3. Sync staging → production"
echo "4. Update environment variables"
echo "5. Restart services"
echo "6. Validate deployment"
