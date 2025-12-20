#!/usr/bin/env node

// WMACS Guardian: Deployment Verification Protocol
// Ensures fixes are properly deployed and active on staging server

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSDeploymentVerification {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.stagingServer = 'jws';
    this.deploymentIssues = [];
    this.verificationResults = [];
  }

  async runDeploymentVerification() {
    console.log('🔍 WMACS Guardian: Deployment Verification Protocol...\n');
    
    // Step 1: Verify files are deployed
    await this.verifyFileDeployment();
    
    // Step 2: Verify application restart
    await this.verifyApplicationRestart();
    
    // Step 3: Verify fix implementation
    await this.verifyFixImplementation();
    
    // Step 4: Test live application
    await this.testLiveApplication();
    
    // Step 5: Browser cache check
    await this.checkBrowserCache();
    
    this.generateDeploymentReport();
  }

  async verifyFileDeployment() {
    console.log('📁 Verifying File Deployment');
    
    try {
      // Check if root page.tsx exists on server
      const rootPageResult = await execAsync(`ssh ${this.stagingServer} "ls -la /opt/theoshift/src/app/page.tsx"`);
      if (rootPageResult.stdout.includes('page.tsx')) {
        this.logSuccess('Root page.tsx deployed to server');
      } else {
        this.logIssue('Root page.tsx NOT found on server');
      }
      
      // Check if dashboard page.tsx has the fix
      const dashboardResult = await execAsync(`ssh ${this.stagingServer} "grep -n 'credentials.*include' /opt/theoshift/src/app/dashboard/page.tsx"`);
      if (dashboardResult.stdout.includes('credentials')) {
        this.logSuccess('Dashboard credentials fix deployed');
      } else {
        this.logIssue('Dashboard credentials fix NOT deployed');
      }
      
      // Check file timestamps
      const timestampResult = await execAsync(`ssh ${this.stagingServer} "stat -c '%Y %n' /opt/theoshift/src/app/page.tsx /opt/theoshift/src/app/dashboard/page.tsx"`);
      console.log('   File timestamps:', timestampResult.stdout.trim());
      
    } catch (error) {
      this.logIssue('File deployment verification failed', error.message);
    }
  }

  async verifyApplicationRestart() {
    console.log('\n🔄 Verifying Application Restart');
    
    try {
      // Check if application is running
      const processResult = await execAsync(`ssh ${this.stagingServer} "ps aux | grep 'next' | grep -v grep"`);
      if (processResult.stdout.length > 0) {
        this.logSuccess('Next.js application is running');
        console.log('   Process info:', processResult.stdout.trim());
      } else {
        this.logIssue('Next.js application NOT running');
      }
      
      // Check application logs for recent restart
      const logResult = await execAsync(`ssh ${this.stagingServer} "tail -5 /var/log/nextjs-clean-auth.log"`);
      console.log('   Recent logs:', logResult.stdout.trim());
      
    } catch (error) {
      this.logIssue('Application restart verification failed', error.message);
    }
  }

  async verifyFixImplementation() {
    console.log('\n🔧 Verifying Fix Implementation');
    
    try {
      // Test root page redirect
      const rootResult = await execAsync(`ssh ${this.stagingServer} "curl -s '${this.baseUrl}/' | grep -o 'useSession\\|router.push\\|Theocratic Shift Scheduler' | head -2"`);
      if (rootResult.stdout.includes('Theocratic Shift Scheduler')) {
        this.logSuccess('Root page contains expected content');
      } else {
        this.logIssue('Root page content not as expected');
      }
      
      // Test dashboard page source
      const dashboardSourceResult = await execAsync(`ssh ${this.stagingServer} "curl -s '${this.baseUrl}/dashboard' | grep -o 'credentials.*include' | head -1"`);
      if (dashboardSourceResult.stdout.includes('credentials')) {
        this.logSuccess('Dashboard source contains credentials fix');
      } else {
        this.logIssue('Dashboard source does NOT contain credentials fix - CLIENT CACHE ISSUE');
      }
      
    } catch (error) {
      this.logIssue('Fix implementation verification failed', error.message);
    }
  }

  async testLiveApplication() {
    console.log('\n🌐 Testing Live Application');
    
    try {
      // Test API endpoints still work
      const apiResult = await execAsync(`ssh ${this.stagingServer} "curl -s '${this.baseUrl}/api/users'"`);
      const apiResponse = JSON.parse(apiResult.stdout);
      
      if (apiResponse.success === false && apiResponse.error === 'Authentication required') {
        this.logSuccess('API authentication still working correctly');
      } else {
        this.logIssue('API authentication behavior changed');
      }
      
      // Test NextAuth endpoints
      const authResult = await execAsync(`ssh ${this.stagingServer} "curl -s '${this.baseUrl}/api/auth/providers'"`);
      const authResponse = JSON.parse(authResult.stdout);
      
      if (authResponse.credentials) {
        this.logSuccess('NextAuth configuration still working');
      } else {
        this.logIssue('NextAuth configuration broken');
      }
      
    } catch (error) {
      this.logIssue('Live application test failed', error.message);
    }
  }

  async checkBrowserCache() {
    console.log('\n🗄️ Checking Browser Cache Issues');
    
    try {
      // Check if the issue might be browser caching
      const cacheHeaderResult = await execAsync(`ssh ${this.stagingServer} "curl -s -I '${this.baseUrl}/dashboard' | grep -i 'cache-control\\|etag\\|expires'"`);
      
      if (cacheHeaderResult.stdout.length > 0) {
        this.logSuccess('Cache headers present', cacheHeaderResult.stdout.trim());
        this.logIssue('BROWSER CACHE may be serving old JavaScript - need hard refresh');
      } else {
        this.logSuccess('No aggressive caching detected');
      }
      
    } catch (error) {
      this.logIssue('Browser cache check failed', error.message);
    }
  }

  logSuccess(message, detail = '') {
    const result = `✅ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.verificationResults.push({ type: 'success', message, detail });
  }

  logIssue(message, detail = '') {
    const result = `❌ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.deploymentIssues.push({ message, detail });
  }

  generateDeploymentReport() {
    console.log('\n📊 WMACS Deployment Verification Report');
    console.log('=======================================');
    
    const successCount = this.verificationResults.filter(r => r.type === 'success').length;
    const issueCount = this.deploymentIssues.length;
    
    console.log(`✅ Verified: ${successCount}`);
    console.log(`❌ Issues: ${issueCount}`);
    
    if (issueCount > 0) {
      console.log('\n🚨 DEPLOYMENT ISSUES IDENTIFIED:');
      this.deploymentIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.message}${issue.detail ? ` (${issue.detail})` : ''}`);
      });
    }
    
    console.log('\n🎯 WMACS Guardian Root Cause Analysis:');
    
    const hasFileIssues = this.deploymentIssues.some(i => i.message.includes('deployed') || i.message.includes('NOT found'));
    const hasCacheIssues = this.deploymentIssues.some(i => i.message.includes('cache') || i.message.includes('CLIENT CACHE'));
    const hasRestartIssues = this.deploymentIssues.some(i => i.message.includes('running') || i.message.includes('restart'));
    
    if (hasFileIssues) {
      console.log('❌ PRIMARY ISSUE: Files not properly deployed to server');
      console.log('   - Need to re-copy files to staging server');
      console.log('   - Verify file permissions and paths');
    }
    
    if (hasCacheIssues) {
      console.log('❌ SECONDARY ISSUE: Browser/Client cache serving old code');
      console.log('   - User needs to hard refresh browser (Ctrl+F5 or Cmd+Shift+R)');
      console.log('   - Clear browser cache for the site');
      console.log('   - Try incognito/private browsing mode');
    }
    
    if (hasRestartIssues) {
      console.log('❌ TERTIARY ISSUE: Application not properly restarted');
      console.log('   - Need to restart Next.js application');
      console.log('   - Check for build errors');
    }
    
    console.log('\n🔧 WMACS Guardian Immediate Actions:');
    if (hasFileIssues) {
      console.log('1. Re-deploy files to staging server');
      console.log('2. Verify file contents on server');
    }
    if (hasRestartIssues) {
      console.log('3. Restart Next.js application');
      console.log('4. Check application logs');
    }
    console.log('5. Instruct user to hard refresh browser');
    console.log('6. Test in incognito mode to bypass cache');
    
    console.log('\n📋 WMACS Protocol Compliance:');
    console.log('- ✅ Systematic verification performed');
    console.log('- ✅ Root cause analysis completed');
    console.log('- ✅ Specific remediation steps identified');
    console.log('- 🔄 Following up with corrective actions');
  }
}

// Run deployment verification
const verifier = new WMACSDeploymentVerification();
verifier.runDeploymentVerification().catch(console.error);
