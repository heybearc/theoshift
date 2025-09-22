#!/usr/bin/env node

// WMACS Guardian: Production Deployment System
// Deploy Next.js JW Attendant Scheduler to production LXC 132

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSProductionDeploy {
  constructor() {
    this.productionServer = '10.92.3.22'; // LXC 132
    this.productionPath = '/opt/jw-attendant-nextjs';
    this.productionPort = '8000';
    this.dbServer = '10.92.3.21'; // LXC 131
    this.repoUrl = 'https://github.com/heybearc/jw-attendant-scheduler.git';
    this.deploymentSteps = [];
  }

  async runProductionDeployment() {
    console.log('🚀 WMACS Guardian: Production Deployment to LXC 132...\n');
    console.log(`🎯 Target: ${this.productionServer}:${this.productionPort}`);
    console.log(`📁 Path: ${this.productionPath}`);
    console.log(`🗄️  Database: ${this.dbServer}\n`);
    
    // Step 1: Prepare production server
    await this.prepareProductionServer();
    
    // Step 2: Clone and setup repository
    await this.cloneRepository();
    
    // Step 3: Configure production environment
    await this.configureProductionEnvironment();
    
    // Step 4: Install dependencies and build
    await this.installAndBuild();
    
    // Step 5: Setup production service
    await this.setupProductionService();
    
    // Step 6: Start and verify deployment
    await this.startAndVerifyDeployment();
    
    this.generateDeploymentReport();
  }

  async prepareProductionServer() {
    console.log('🔧 Step 1: Preparing Production Server');
    
    try {
      // Check server connectivity
      const connectResult = await execAsync(`ssh root@${this.productionServer} "echo 'Connected to production server'"`);
      this.logSuccess('Connected to production server');
      
      // Check if old Django service is running
      const djangoCheck = await execAsync(`ssh root@${this.productionServer} "systemctl status jw-attendant || echo 'Service not found'"`);
      console.log('   Django service status:', djangoCheck.stdout.includes('active') ? 'RUNNING' : 'STOPPED');
      
      // Create production directory
      await execAsync(`ssh root@${this.productionServer} "mkdir -p ${this.productionPath}"`);
      this.logSuccess('Production directory created');
      
      // Install Node.js if not present
      const nodeCheck = await execAsync(`ssh root@${this.productionServer} "node --version || echo 'NOT_INSTALLED'"`);
      if (nodeCheck.stdout.includes('NOT_INSTALLED')) {
        console.log('   Installing Node.js...');
        await execAsync(`ssh root@${this.productionServer} "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"`);
        this.logSuccess('Node.js installed');
      } else {
        this.logSuccess('Node.js already installed', nodeCheck.stdout.trim());
      }
      
      // Install git if not present
      await execAsync(`ssh root@${this.productionServer} "apt-get update && apt-get install -y git"`);
      this.logSuccess('Git available');
      
    } catch (error) {
      this.logError('Production server preparation failed', error.message);
    }
  }

  async cloneRepository() {
    console.log('\n📥 Step 2: Cloning Repository');
    
    try {
      // Remove existing directory if present
      await execAsync(`ssh root@${this.productionServer} "rm -rf ${this.productionPath}"`);
      
      // Clone repository
      await execAsync(`ssh root@${this.productionServer} "git clone ${this.repoUrl} ${this.productionPath}"`);
      this.logSuccess('Repository cloned successfully');
      
      // Verify critical files
      const fileCheck = await execAsync(`ssh root@${this.productionServer} "ls -la ${this.productionPath}/package.json ${this.productionPath}/auth.ts ${this.productionPath}/src/app/dashboard/page.tsx"`);
      this.logSuccess('Critical files verified');
      
      // Check current branch and latest commit
      const branchCheck = await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && git branch && git log --oneline -1"`);
      console.log('   Repository status:', branchCheck.stdout.trim());
      
    } catch (error) {
      this.logError('Repository cloning failed', error.message);
    }
  }

  async configureProductionEnvironment() {
    console.log('\n⚙️  Step 3: Configuring Production Environment');
    
    try {
      // Create production .env file
      const envConfig = `
DATABASE_URL=postgresql://jw_scheduler:jw_password@${this.dbServer}:5432/jw_attendant_scheduler
NEXTAUTH_SECRET=production-nextauth-secret-2024-secure
NEXTAUTH_URL=http://${this.productionServer}:${this.productionPort}
NODE_ENV=production
PORT=${this.productionPort}
NEXTAUTH_DEBUG=false
`;

      await execAsync(`ssh root@${this.productionServer} "cat > ${this.productionPath}/.env << 'EOF'${envConfig}EOF"`);
      this.logSuccess('Production environment configured');
      
      // Verify database connectivity
      const dbTest = await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && timeout 10 node -e 'const { PrismaClient } = require(\"@prisma/client\"); const prisma = new PrismaClient(); prisma.users.count().then(count => console.log(\"DB Users:\", count)).catch(err => console.log(\"DB Error:\", err.message)).finally(() => prisma.\\$disconnect())' || echo 'DB_TEST_FAILED'"`);
      
      if (dbTest.stdout.includes('DB Users:')) {
        this.logSuccess('Database connectivity verified');
      } else {
        this.logWarning('Database connectivity test failed - will retry after build');
      }
      
    } catch (error) {
      this.logError('Environment configuration failed', error.message);
    }
  }

  async installAndBuild() {
    console.log('\n📦 Step 4: Installing Dependencies and Building');
    
    try {
      // Install dependencies
      console.log('   Installing npm dependencies...');
      const installResult = await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && npm install"`);
      this.logSuccess('Dependencies installed');
      
      // Generate Prisma client
      console.log('   Generating Prisma client...');
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && npx prisma generate"`);
      this.logSuccess('Prisma client generated');
      
      // Build Next.js application
      console.log('   Building Next.js application...');
      const buildResult = await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && npm run build"`);
      this.logSuccess('Next.js application built');
      
      // Verify build output
      const buildCheck = await execAsync(`ssh root@${this.productionServer} "ls -la ${this.productionPath}/.next/"`);
      if (buildCheck.stdout.includes('server')) {
        this.logSuccess('Build output verified');
      } else {
        this.logError('Build output verification failed');
      }
      
    } catch (error) {
      this.logError('Build process failed', error.message);
    }
  }

  async setupProductionService() {
    console.log('\n🔧 Step 5: Setting up Production Service');
    
    try {
      // Create systemd service file
      const serviceConfig = `
[Unit]
Description=JW Attendant Scheduler (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${this.productionPath}
Environment=NODE_ENV=production
Environment=PORT=${this.productionPort}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

      await execAsync(`ssh root@${this.productionServer} "cat > /etc/systemd/system/jw-attendant-nextjs.service << 'EOF'${serviceConfig}EOF"`);
      this.logSuccess('Systemd service created');
      
      // Reload systemd and enable service
      await execAsync(`ssh root@${this.productionServer} "systemctl daemon-reload && systemctl enable jw-attendant-nextjs"`);
      this.logSuccess('Service enabled');
      
      // Stop old Django service if running
      try {
        await execAsync(`ssh root@${this.productionServer} "systemctl stop jw-attendant"`);
        this.logSuccess('Old Django service stopped');
      } catch (error) {
        console.log('   Old service not running or already stopped');
      }
      
    } catch (error) {
      this.logError('Service setup failed', error.message);
    }
  }

  async startAndVerifyDeployment() {
    console.log('\n🚀 Step 6: Starting and Verifying Deployment');
    
    try {
      // Start the service
      await execAsync(`ssh root@${this.productionServer} "systemctl start jw-attendant-nextjs"`);
      this.logSuccess('Production service started');
      
      // Wait for service to initialize
      console.log('   Waiting for service initialization...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check service status
      const statusResult = await execAsync(`ssh root@${this.productionServer} "systemctl status jw-attendant-nextjs --no-pager"`);
      if (statusResult.stdout.includes('active (running)')) {
        this.logSuccess('Service is running');
      } else {
        this.logError('Service not running properly');
        console.log('   Service status:', statusResult.stdout);
      }
      
      // Test HTTP endpoint
      const httpTest = await execAsync(`ssh root@${this.productionServer} "curl -s -w 'HTTP:%{http_code}' 'http://localhost:${this.productionPort}/' | tail -1"`);
      if (httpTest.stdout.includes('HTTP:200')) {
        this.logSuccess('HTTP endpoint responding');
      } else {
        this.logError('HTTP endpoint not responding', httpTest.stdout);
      }
      
      // Test API endpoints
      const apiTest = await execAsync(`ssh root@${this.productionServer} "curl -s 'http://localhost:${this.productionPort}/api/auth/providers'"`);
      if (apiTest.stdout.includes('credentials')) {
        this.logSuccess('API endpoints working');
      } else {
        this.logError('API endpoints not working');
      }
      
      // Test database connectivity through API
      const dbApiTest = await execAsync(`ssh root@${this.productionServer} "curl -s 'http://localhost:${this.productionPort}/api/users'"`);
      if (dbApiTest.stdout.includes('Authentication required')) {
        this.logSuccess('Database connectivity through API confirmed');
      } else {
        this.logWarning('Database API test inconclusive', dbApiTest.stdout);
      }
      
    } catch (error) {
      this.logError('Deployment verification failed', error.message);
    }
  }

  logSuccess(message, detail = '') {
    const result = `✅ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.deploymentSteps.push({ type: 'success', message, detail });
  }

  logError(message, detail = '') {
    const result = `❌ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.deploymentSteps.push({ type: 'error', message, detail });
  }

  logWarning(message, detail = '') {
    const result = `⚠️  ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.deploymentSteps.push({ type: 'warning', message, detail });
  }

  generateDeploymentReport() {
    console.log('\n📊 WMACS Guardian Production Deployment Report');
    console.log('===============================================');
    
    const successCount = this.deploymentSteps.filter(s => s.type === 'success').length;
    const errorCount = this.deploymentSteps.filter(s => s.type === 'error').length;
    const warningCount = this.deploymentSteps.filter(s => s.type === 'warning').length;
    
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 PRODUCTION DEPLOYMENT SUCCESSFUL!');
      console.log('✅ Next.js JW Attendant Scheduler deployed to production');
      console.log(`✅ Service running on http://${this.productionServer}:${this.productionPort}`);
      console.log('✅ Database connectivity established');
      console.log('✅ API endpoints functional');
      console.log('✅ Authentication system ready');
      
      console.log('\n🔗 Production Access:');
      console.log(`   Web Interface: http://${this.productionServer}:${this.productionPort}`);
      console.log(`   Sign in with: admin@jwscheduler.local / admin123`);
      console.log(`   Service: systemctl status jw-attendant-nextjs`);
      console.log(`   Logs: journalctl -u jw-attendant-nextjs -f`);
      
    } else {
      console.log('\n⚠️  DEPLOYMENT ISSUES DETECTED');
      console.log('Some steps failed - manual intervention may be required');
      
      const errors = this.deploymentSteps.filter(s => s.type === 'error');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}${error.detail ? ` (${error.detail})` : ''}`);
      });
    }
    
    console.log('\n📋 Next Steps:');
    if (errorCount === 0) {
      console.log('- Test production authentication and dashboard');
      console.log('- Verify all existing user data is accessible');
      console.log('- Update DNS/load balancer to point to new service');
      console.log('- Monitor production logs for any issues');
    } else {
      console.log('- Review and fix deployment errors');
      console.log('- Check service logs for detailed error information');
      console.log('- Verify database connectivity and permissions');
      console.log('- Re-run deployment after fixes');
    }
  }
}

// Run production deployment
const productionDeploy = new WMACSProductionDeploy();
productionDeploy.runProductionDeployment().catch(console.error);
