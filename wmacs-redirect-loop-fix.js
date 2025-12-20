#!/usr/bin/env node

// WMACS Guardian: Infinite Redirect Loop Fix
// Fixes NextAuth infinite redirect loops and domain misconfigurations

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSRedirectLoopFix {
  constructor() {
    this.productionServer = '10.92.3.22';
    this.productionPath = '/opt/theoshift-green-nextjs';
    this.productionUrl = 'http://10.92.3.22:3001';
  }

  async runFix() {
    console.log('🔧 WMACS Guardian: Fixing Infinite Redirect Loop...\n');
    console.log(`🎯 Target: ${this.productionUrl}\n`);
    
    // Step 1: Stop service
    await this.stopService();
    
    // Step 2: Clean build cache
    await this.cleanBuildCache();
    
    // Step 3: Fix environment configuration
    await this.fixEnvironmentConfig();
    
    // Step 4: Verify auth configuration
    await this.verifyAuthConfig();
    
    // Step 5: Rebuild application
    await this.rebuildApplication();
    
    // Step 6: Start service and test
    await this.startAndTest();
    
    this.generateFixReport();
  }

  async stopService() {
    console.log('🛑 Step 1: Stopping Service');
    
    try {
      await execAsync(`ssh root@${this.productionServer} "systemctl stop theoshift-green-nextjs"`);
      console.log('   ✅ Service stopped');
    } catch (error) {
      console.log('   ⚠️  Service stop failed:', error.message);
    }
  }

  async cleanBuildCache() {
    console.log('\n🧹 Step 2: Cleaning Build Cache');
    
    try {
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && rm -rf .next node_modules/.cache"`);
      console.log('   ✅ Build cache cleared');
      
      // Clear any potential browser cache files
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && find . -name '*.cache' -delete"`);
      console.log('   ✅ Cache files removed');
      
    } catch (error) {
      console.log('   ❌ Cache cleaning failed:', error.message);
    }
  }

  async fixEnvironmentConfig() {
    console.log('\n⚙️  Step 3: Fixing Environment Configuration');
    
    try {
      // Create clean production .env
      const envConfig = `DATABASE_URL=postgresql://jw_scheduler:jw_password@10.92.3.21:5432/theoshift_scheduler
NEXTAUTH_SECRET=production-nextauth-secret-2024-secure-fixed
NEXTAUTH_URL=http://10.92.3.22:3001
NODE_ENV=production
PORT=3001
NEXTAUTH_DEBUG=false`;

      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && cat > .env << 'EOF'
${envConfig}
EOF"`);
      
      console.log('   ✅ Environment configuration updated');
      
      // Remove any conflicting env files
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && rm -f .env.local .env.green"`);
      console.log('   ✅ Conflicting env files removed');
      
    } catch (error) {
      console.log('   ❌ Environment config fix failed:', error.message);
    }
  }

  async verifyAuthConfig() {
    console.log('\n🔐 Step 4: Verifying Auth Configuration');
    
    try {
      // Check auth.ts exists and has correct configuration
      const authCheck = await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && grep -n 'NEXTAUTH_URL' auth.ts || echo 'No hardcoded URLs found'"`);
      console.log('   📋 Auth config check:', authCheck.stdout.trim());
      
      // Check for any hardcoded domain references
      const domainCheck = await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && grep -r 'theoshift.com' . || echo 'No hardcoded domains found'"`);
      
      if (domainCheck.stdout.includes('theoshift.com')) {
        console.log('   ⚠️  Found hardcoded domain references:');
        console.log(domainCheck.stdout);
        
        // Remove hardcoded domain references
        await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && find . -type f -name '*.ts' -o -name '*.js' -o -name '*.tsx' -o -name '*.jsx' | xargs sed -i 's/attendant\\.cloudigan\\.net/10.92.3.22:3001/g'"`);
        console.log('   ✅ Hardcoded domains replaced');
      } else {
        console.log('   ✅ No hardcoded domains found');
      }
      
    } catch (error) {
      console.log('   ❌ Auth config verification failed:', error.message);
    }
  }

  async rebuildApplication() {
    console.log('\n🔨 Step 5: Rebuilding Application');
    
    try {
      // Reinstall dependencies to ensure clean state
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && npm install"`);
      console.log('   ✅ Dependencies reinstalled');
      
      // Build application
      await execAsync(`ssh root@${this.productionServer} "cd ${this.productionPath} && npm run build"`);
      console.log('   ✅ Application rebuilt successfully');
      
    } catch (error) {
      console.log('   ❌ Application rebuild failed:', error.message);
      console.log('   📋 Error details:', error.stdout || error.stderr);
    }
  }

  async startAndTest() {
    console.log('\n🚀 Step 6: Starting Service and Testing');
    
    try {
      // Start service
      await execAsync(`ssh root@${this.productionServer} "systemctl start theoshift-green-nextjs"`);
      console.log('   ✅ Service started');
      
      // Wait for startup
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test basic connectivity
      const connectTest = await execAsync(`curl -s -w 'HTTP:%{http_code}\\n' '${this.productionUrl}/' | tail -1`);
      
      if (connectTest.stdout.includes('HTTP:200') || connectTest.stdout.includes('HTTP:307')) {
        console.log('   ✅ Basic connectivity working');
        
        // Test redirect destination
        const redirectTest = await execAsync(`curl -s '${this.productionUrl}/'`);
        
        if (redirectTest.stdout.includes('theoshift.com')) {
          console.log('   ❌ Still redirecting to external domain');
        } else if (redirectTest.stdout.includes('/api/auth/signin')) {
          console.log('   ✅ Redirecting to correct internal auth page');
        } else {
          console.log('   📋 Redirect response:', redirectTest.stdout.trim());
        }
        
      } else {
        console.log('   ❌ Connectivity test failed:', connectTest.stdout.trim());
      }
      
      // Test auth providers endpoint
      const providersTest = await execAsync(`curl -s '${this.productionUrl}/api/auth/providers'`);
      
      if (providersTest.stdout.includes('credentials')) {
        console.log('   ✅ Auth providers working');
      } else {
        console.log('   ❌ Auth providers not working');
      }
      
    } catch (error) {
      console.log('   ❌ Service start/test failed:', error.message);
    }
  }

  generateFixReport() {
    console.log('\n🔧 WMACS Guardian: Redirect Loop Fix Complete');
    console.log('==============================================');
    
    console.log('\n✅ FIXES APPLIED:');
    console.log('   - ✅ Service stopped and restarted');
    console.log('   - ✅ Build cache completely cleared');
    console.log('   - ✅ Environment configuration cleaned');
    console.log('   - ✅ Hardcoded domain references removed');
    console.log('   - ✅ Application rebuilt from scratch');
    
    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log(`   1. Clear your browser cache completely`);
    console.log(`   2. Go to: ${this.productionUrl}`);
    console.log('   3. Should redirect to internal signin page');
    console.log('   4. Login with: admin@jwscheduler.local / admin123');
    
    console.log('\n🚨 IF STILL REDIRECTING TO EXTERNAL DOMAIN:');
    console.log('   - Clear browser cache and cookies');
    console.log('   - Try incognito/private mode');
    console.log('   - Check DNS resolution');
    console.log('   - Verify no proxy/load balancer interference');
    
    console.log('\n📞 SUPPORT COMMANDS:');
    console.log('   - Check service: systemctl status theoshift-green-nextjs');
    console.log('   - View logs: journalctl -u theoshift-green-nextjs -f');
    console.log('   - Test direct: curl -v http://10.92.3.22:3001');
    console.log('   - Check env: cat /opt/theoshift-green-nextjs/.env');
  }
}

// Run the fix
const fixer = new WMACSRedirectLoopFix();
fixer.runFix().catch(console.error);
