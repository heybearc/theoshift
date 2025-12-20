#!/usr/bin/env node

// WMACS UAT Guardian - User Acceptance Testing for Authentication
// Tests authentication from actual user perspective

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSUATGuardian {
  constructor() {
    this.testUrl = 'http://10.92.3.24:3001';
    this.testCredentials = [
      { email: 'admin@jwscheduler.local', password: 'admin123' },
      { email: 'corylallen@gmail.com', password: 'admin123' },
      { email: 'admin@jwscheduler.local', password: 'AdminPass123!' }
    ];
  }

  async runUATTests() {
    console.log('🧪 WMACS UAT Guardian: Starting User Acceptance Tests...');
    console.log(`🌐 Testing URL: ${this.testUrl}`);
    
    // Test 1: Application Accessibility
    await this.testApplicationAccess();
    
    // Test 2: Authentication Page Load
    await this.testAuthPageLoad();
    
    // Test 3: Database Connection Test
    await this.testDatabaseConnection();
    
    // Test 4: Authentication Flow Test
    await this.testAuthenticationFlow();
    
    // Test 5: NextAuth Debug Logs
    await this.checkNextAuthLogs();
    
    console.log('📊 WMACS UAT Guardian: Tests completed');
  }

  async testApplicationAccess() {
    console.log('\n🔍 UAT Test 1: Application Accessibility');
    
    try {
      const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' ${this.testUrl} | tail -1"`);
      console.log(`   Response: ${result.stdout.trim()}`);
      
      if (result.stdout.includes('HTTP:200')) {
        console.log('   ✅ Application is accessible');
      } else {
        console.log('   ❌ Application access failed');
      }
    } catch (error) {
      console.log(`   ❌ Application access error: ${error.message}`);
    }
  }

  async testAuthPageLoad() {
    console.log('\n🔍 UAT Test 2: Authentication Page Load');
    
    try {
      const result = await execAsync(`ssh jws "curl -s '${this.testUrl}/auth/signin' | grep -o 'Theocratic Shift Scheduler' | head -1"`);
      
      if (result.stdout.trim() === 'Theocratic Shift Scheduler') {
        console.log('   ✅ Authentication page loads correctly');
      } else {
        console.log('   ❌ Authentication page load failed');
      }
    } catch (error) {
      console.log(`   ❌ Auth page test error: ${error.message}`);
    }
  }

  async testDatabaseConnection() {
    console.log('\n🔍 UAT Test 3: Database Connection');
    
    try {
      const result = await execAsync(`ssh jws "cd /opt/theoshift && PGPASSWORD=jw_password psql -h 10.92.3.21 -U jw_scheduler_staging -d theoshift_scheduler_staging -c 'SELECT COUNT(*) FROM users WHERE role = \\'ADMIN\\';' -t"`);
      
      const adminCount = result.stdout.trim();
      console.log(`   Admin users found: ${adminCount}`);
      
      if (parseInt(adminCount) > 0) {
        console.log('   ✅ Database connection and admin users verified');
      } else {
        console.log('   ❌ No admin users found in database');
      }
    } catch (error) {
      console.log(`   ❌ Database test error: ${error.message}`);
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔍 UAT Test 4: Authentication Flow');
    
    for (const creds of this.testCredentials) {
      console.log(`   Testing: ${creds.email} / ${creds.password}`);
      
      try {
        // Get CSRF token first
        const csrfResult = await execAsync(`ssh jws "curl -s '${this.testUrl}/api/auth/csrf'"`);
        const csrfToken = JSON.parse(csrfResult.stdout).csrfToken;
        
        // Test authentication
        const authResult = await execAsync(`ssh jws "curl -s -X POST '${this.testUrl}/api/auth/callback/credentials' -H 'Content-Type: application/x-www-form-urlencoded' -d 'email=${creds.email}&password=${creds.password}&csrfToken=${csrfToken}' -w 'HTTP:%{http_code}'"`);
        
        console.log(`     Response: ${authResult.stdout.slice(-10)}`);
        
        if (authResult.stdout.includes('HTTP:200') || authResult.stdout.includes('HTTP:302')) {
          console.log(`     ✅ Authentication successful for ${creds.email}`);
          return; // Stop testing once we find working credentials
        } else {
          console.log(`     ❌ Authentication failed for ${creds.email}`);
        }
      } catch (error) {
        console.log(`     ❌ Auth test error for ${creds.email}: ${error.message}`);
      }
    }
  }

  async checkNextAuthLogs() {
    console.log('\n🔍 UAT Test 5: NextAuth Debug Logs');
    
    try {
      const result = await execAsync(`ssh jws "tail -20 /var/log/nextjs-clean-auth.log | grep -i 'auth\\|error\\|prisma' || echo 'No auth logs found'"`);
      console.log('   Recent logs:');
      console.log(`   ${result.stdout.trim()}`);
    } catch (error) {
      console.log(`   ❌ Log check error: ${error.message}`);
    }
  }
}

// Run UAT tests
const uatGuardian = new WMACSUATGuardian();
uatGuardian.runUATTests().catch(console.error);
