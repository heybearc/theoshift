#!/usr/bin/env node

// WMACS Guardian: Regression Test Suite
// Run this after ANY authentication-related changes to prevent regressions

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSRegressionTest {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.criticalTests = [
      { name: 'Root Page Loads', test: () => this.testRoute('/') },
      { name: 'Signin Page Loads', test: () => this.testRoute('/auth/signin') },
      { name: 'Custom Signin Form', test: () => this.testSigninForm() },
      { name: 'NextAuth API', test: () => this.testNextAuthAPI() },
      { name: 'Authentication Flow', test: () => this.testAuthFlow() }
    ];
    this.passed = 0;
    this.failed = 0;
  }

  async runRegressionTests() {
    console.log('🔍 WMACS Guardian: Running Regression Tests...\n');
    
    for (const test of this.criticalTests) {
      try {
        const result = await test.test();
        if (result) {
          console.log(`✅ ${test.name}`);
          this.passed++;
        } else {
          console.log(`❌ ${test.name} - FAILED`);
          this.failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name} - ERROR: ${error.message}`);
        this.failed++;
      }
    }
    
    this.printSummary();
  }

  async testRoute(route) {
    const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}${route}' | tail -1"`);
    return result.stdout.includes('HTTP:200');
  }

  async testSigninForm() {
    const result = await execAsync(`ssh jws "curl -s '${this.baseUrl}/auth/signin' | grep -o 'Test credentials:' || echo 'NOT_FOUND'"`);
    return result.stdout.includes('Test credentials:');
  }

  async testNextAuthAPI() {
    const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/api/auth/providers' | tail -1"`);
    return result.stdout.includes('HTTP:200');
  }

  async testAuthFlow() {
    try {
      // Get CSRF token
      const csrfResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/api/auth/csrf'"`);
      const csrfData = JSON.parse(csrfResult.stdout);
      
      if (!csrfData.csrfToken) return false;
      
      // Test authentication
      const authResult = await execAsync(`ssh jws "curl -X POST '${this.baseUrl}/api/auth/callback/credentials' -H 'Content-Type: application/x-www-form-urlencoded' -d 'email=admin@jwscheduler.local&password=admin123&csrfToken=${csrfData.csrfToken}' -w 'HTTP:%{http_code}' -s | tail -1"`);
      
      return authResult.stdout.includes('HTTP:302');
    } catch (error) {
      return false;
    }
  }

  printSummary() {
    console.log('\n📊 WMACS Regression Test Results:');
    console.log('==================================');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    
    if (this.failed === 0) {
      console.log('\n🎉 ALL REGRESSION TESTS PASSED!');
      console.log('✅ Authentication flow is working correctly');
      console.log('✅ Safe to deploy changes');
      process.exit(0);
    } else {
      console.log('\n🚨 REGRESSION DETECTED!');
      console.log('❌ DO NOT DEPLOY - Fix issues first');
      console.log('❌ Authentication flow is broken');
      process.exit(1);
    }
  }
}

// Auto-run if called directly
if (require.main === module) {
  const tester = new WMACSRegressionTest();
  tester.runRegressionTests().catch(console.error);
}

module.exports = WMACSRegressionTest;
