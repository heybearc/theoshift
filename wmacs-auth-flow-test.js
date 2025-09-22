#!/usr/bin/env node

// WMACS Guardian: Comprehensive Authentication Flow Test
// Tests all authentication scenarios to prevent regressions

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSAuthFlowTest {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.testResults = [];
    this.failedTests = [];
  }

  async runAllTests() {
    console.log('🧪 WMACS Guardian: Starting Comprehensive Auth Flow Tests...\n');
    
    // Test 1: Root page redirect behavior
    await this.testRootPageRedirect();
    
    // Test 2: Signin page accessibility
    await this.testSigninPageAccess();
    
    // Test 3: NextAuth API endpoints
    await this.testNextAuthAPI();
    
    // Test 4: Authentication flow
    await this.testAuthenticationFlow();
    
    // Test 5: Protected route behavior
    await this.testProtectedRoutes();
    
    // Test 6: Session handling
    await this.testSessionHandling();
    
    this.printResults();
  }

  async testRootPageRedirect() {
    console.log('🔍 Test 1: Root Page Redirect Behavior');
    
    try {
      // Test root page redirects properly
      const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/' | tail -1"`);
      const httpCode = result.stdout.trim();
      
      if (httpCode === 'HTTP:200') {
        this.logSuccess('Root page loads (should redirect to signin)');
        
        // Check if it contains redirect logic
        const contentResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/' | grep -o 'Redirecting' || echo 'No redirect text'"`);
        if (contentResult.stdout.includes('Redirecting')) {
          this.logSuccess('Root page shows redirecting message');
        } else {
          this.logWarning('Root page may not be redirecting properly');
        }
      } else {
        this.logError('Root page failed to load', httpCode);
      }
    } catch (error) {
      this.logError('Root page test failed', error.message);
    }
  }

  async testSigninPageAccess() {
    console.log('\n🔍 Test 2: Signin Page Accessibility');
    
    try {
      // Test signin page loads
      const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/signin' | tail -1"`);
      const httpCode = result.stdout.trim();
      
      if (httpCode === 'HTTP:200') {
        this.logSuccess('Signin page accessible at /signin');
        
        // Check for signin form elements
        const formCheck = await execAsync(`ssh jws "curl -s '${this.baseUrl}/signin' | grep -o 'Test credentials:' || echo 'Not found'"`);
        if (formCheck.stdout.includes('Test credentials:')) {
          this.logSuccess('Custom signin form loads correctly');
        } else {
          this.logError('Custom signin form not found - may be using default NextAuth page');
        }
      } else if (httpCode === 'HTTP:404') {
        this.logError('CRITICAL: Signin page returns 404!', 'This will break authentication flow');
      } else {
        this.logError('Signin page unexpected response', httpCode);
      }
      
      // Test old auth/signin route (should work or redirect)
      const oldRouteResult = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/auth/signin' | tail -1"`);
      const oldHttpCode = oldRouteResult.stdout.trim();
      console.log(`   Legacy /auth/signin route: ${oldHttpCode}`);
      
    } catch (error) {
      this.logError('Signin page test failed', error.message);
    }
  }

  async testNextAuthAPI() {
    console.log('\n🔍 Test 3: NextAuth API Endpoints');
    
    const endpoints = [
      '/api/auth/providers',
      '/api/auth/csrf',
      '/api/auth/session'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}${endpoint}' | tail -1"`);
        const httpCode = result.stdout.trim();
        
        if (httpCode === 'HTTP:200') {
          this.logSuccess(`${endpoint} working`);
        } else {
          this.logError(`${endpoint} failed`, httpCode);
        }
      } catch (error) {
        this.logError(`${endpoint} test failed`, error.message);
      }
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔍 Test 4: Authentication Flow');
    
    try {
      // Get CSRF token
      const csrfResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/api/auth/csrf'"`);
      const csrfData = JSON.parse(csrfResult.stdout);
      const csrfToken = csrfData.csrfToken;
      
      if (csrfToken) {
        this.logSuccess('CSRF token retrieved');
        
        // Test authentication
        const authResult = await execAsync(`ssh jws "curl -X POST '${this.baseUrl}/api/auth/callback/credentials' -H 'Content-Type: application/x-www-form-urlencoded' -d 'email=admin@jwscheduler.local&password=admin123&csrfToken=${csrfToken}' -w 'HTTP:%{http_code}' -s | tail -1"`);
        
        const authCode = authResult.stdout.trim();
        if (authCode === 'HTTP:302') {
          this.logSuccess('Authentication successful (302 redirect)');
        } else if (authCode === 'HTTP:401') {
          this.logError('Authentication failed - Invalid credentials');
        } else {
          this.logError('Authentication unexpected response', authCode);
        }
      } else {
        this.logError('Failed to get CSRF token');
      }
    } catch (error) {
      this.logError('Authentication flow test failed', error.message);
    }
  }

  async testProtectedRoutes() {
    console.log('\n🔍 Test 5: Protected Route Behavior');
    
    const protectedRoutes = ['/dashboard', '/users', '/attendants'];
    
    for (const route of protectedRoutes) {
      try {
        const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}${route}' | tail -1"`);
        const httpCode = result.stdout.trim();
        
        // Protected routes should either redirect (302) or show auth check (200)
        if (httpCode === 'HTTP:200' || httpCode === 'HTTP:302') {
          this.logSuccess(`${route} responds correctly (${httpCode})`);
        } else {
          this.logError(`${route} unexpected response`, httpCode);
        }
      } catch (error) {
        this.logError(`${route} test failed`, error.message);
      }
    }
  }

  async testSessionHandling() {
    console.log('\n🔍 Test 6: Session Handling');
    
    try {
      const result = await execAsync(`ssh jws "curl -s '${this.baseUrl}/api/auth/session'"`);
      const sessionData = result.stdout;
      
      if (sessionData.includes('null') || sessionData === '{}') {
        this.logSuccess('No active session (expected for unauthenticated user)');
      } else {
        this.logInfo('Active session found', sessionData.substring(0, 100));
      }
    } catch (error) {
      this.logError('Session test failed', error.message);
    }
  }

  logSuccess(message, detail = '') {
    const result = `✅ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'success', message, detail });
  }

  logError(message, detail = '') {
    const result = `❌ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'error', message, detail });
    this.failedTests.push({ message, detail });
  }

  logWarning(message, detail = '') {
    const result = `⚠️  ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'warning', message, detail });
  }

  logInfo(message, detail = '') {
    const result = `ℹ️  ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'info', message, detail });
  }

  printResults() {
    console.log('\n📊 WMACS Guardian Test Results:');
    console.log('================================');
    
    const successCount = this.testResults.filter(r => r.type === 'success').length;
    const errorCount = this.testResults.filter(r => r.type === 'error').length;
    const warningCount = this.testResults.filter(r => r.type === 'warning').length;
    
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    
    if (this.failedTests.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES TO FIX:');
      this.failedTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.message}${test.detail ? ` (${test.detail})` : ''}`);
      });
    }
    
    if (errorCount === 0) {
      console.log('\n🎉 All authentication flows working correctly!');
    } else {
      console.log('\n⚠️  Authentication issues detected - fix required!');
    }
  }
}

// Run tests
const tester = new WMACSAuthFlowTest();
tester.runAllTests().catch(console.error);
