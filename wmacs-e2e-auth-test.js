#!/usr/bin/env node

// WMACS Guardian: End-to-End Authentication Testing
// REAL browser simulation - no more assumptions, test the actual flow

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSE2EAuthTest {
  constructor() {
    this.baseUrl = 'http://10.92.3.24:3001';
    this.stagingServer = 'jws';
    this.cookieJar = '/tmp/wmacs_e2e_cookies.txt';
    this.testResults = [];
    this.failures = [];
  }

  async runE2EAuthTest() {
    console.log('🧪 WMACS Guardian: End-to-End Authentication Testing...\n');
    console.log('🎯 REAL browser simulation - testing actual user flow\n');
    
    // Clean start
    await this.cleanupCookies();
    
    // Step 1: Test unauthenticated root page access
    await this.testUnauthenticatedRootAccess();
    
    // Step 2: Test signin page access
    await this.testSigninPageAccess();
    
    // Step 3: Test actual signin process
    await this.testActualSigninProcess();
    
    // Step 4: Test authenticated dashboard access
    await this.testAuthenticatedDashboardAccess();
    
    // Step 5: Test API calls with authentication
    await this.testAuthenticatedAPIAccess();
    
    // Step 6: Test session persistence
    await this.testSessionPersistence();
    
    this.generateE2EReport();
  }

  async testUnauthenticatedRootAccess() {
    console.log('🏠 Step 1: Testing Unauthenticated Root Page Access');
    
    try {
      // Test root page without cookies
      const result = await execAsync(`ssh ${this.stagingServer} "curl -s -L -c ${this.cookieJar} -w 'FINAL_URL:%{url_effective}\\nHTTP_CODE:%{http_code}\\n' '${this.baseUrl}/' | tail -2"`);
      
      console.log('   Root page response:', result.stdout.trim());
      
      // Check if redirected to signin
      if (result.stdout.includes('/auth/signin') || result.stdout.includes('HTTP_CODE:200')) {
        this.logSuccess('Root page accessible');
        
        // Check actual content
        const contentResult = await execAsync(`ssh ${this.stagingServer} "curl -s -L -c ${this.cookieJar} '${this.baseUrl}/' | grep -o 'Sign in\\|Theocratic Shift Scheduler\\|Loading\\|Redirecting' | head -3"`);
        console.log('   Content found:', contentResult.stdout.trim());
        
        if (contentResult.stdout.includes('Theocratic Shift Scheduler')) {
          this.logSuccess('Root page loads with expected content');
        } else {
          this.logFailure('Root page content unexpected');
        }
      } else {
        this.logFailure('Root page not accessible or not redirecting properly');
      }
      
    } catch (error) {
      this.logFailure('Unauthenticated root access test failed', error.message);
    }
  }

  async testSigninPageAccess() {
    console.log('\n🔐 Step 2: Testing Signin Page Access');
    
    try {
      const result = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} -c ${this.cookieJar} -w 'HTTP_CODE:%{http_code}\\n' '${this.baseUrl}/auth/signin' | tail -1"`);
      
      if (result.stdout.includes('HTTP_CODE:200')) {
        this.logSuccess('Signin page accessible');
        
        // Check for signin form elements
        const formResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} '${this.baseUrl}/auth/signin' | grep -o 'admin@jwscheduler.local\\|password\\|Sign in\\|Test credentials' | head -4"`);
        console.log('   Form elements found:', formResult.stdout.trim());
        
        if (formResult.stdout.includes('admin@jwscheduler.local')) {
          this.logSuccess('Signin form contains expected credentials');
        } else {
          this.logFailure('Signin form missing expected elements');
        }
      } else {
        this.logFailure('Signin page not accessible');
      }
      
    } catch (error) {
      this.logFailure('Signin page access test failed', error.message);
    }
  }

  async testActualSigninProcess() {
    console.log('\n🔑 Step 3: Testing Actual Signin Process');
    
    try {
      // Step 3a: Get CSRF token
      const csrfResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} -c ${this.cookieJar} '${this.baseUrl}/api/auth/csrf'"`);
      const csrfData = JSON.parse(csrfResult.stdout);
      
      if (csrfData.csrfToken) {
        this.logSuccess('CSRF token obtained');
        console.log('   CSRF Token:', csrfData.csrfToken.substring(0, 20) + '...');
        
        // Step 3b: Attempt signin
        const signinData = `csrfToken=${encodeURIComponent(csrfData.csrfToken)}&email=admin%40jwscheduler.local&password=admin123&callbackUrl=${encodeURIComponent(this.baseUrl + '/dashboard')}`;
        
        const signinResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} -c ${this.cookieJar} -X POST -H 'Content-Type: application/x-www-form-urlencoded' -L -w 'FINAL_URL:%{url_effective}\\nHTTP_CODE:%{http_code}\\n' -d '${signinData}' '${this.baseUrl}/api/auth/callback/credentials' | tail -2"`);
        
        console.log('   Signin response:', signinResult.stdout.trim());
        
        // Step 3c: Check session after signin
        const sessionResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} '${this.baseUrl}/api/auth/session'"`);
        console.log('   Session after signin:', sessionResult.stdout.trim());
        
        const sessionData = JSON.parse(sessionResult.stdout);
        if (sessionData.user && sessionData.user.email) {
          this.logSuccess('Signin successful - session established');
          console.log('   Authenticated user:', sessionData.user.email);
        } else {
          this.logFailure('Signin failed - no valid session');
          console.log('   Session data:', sessionResult.stdout);
        }
        
      } else {
        this.logFailure('CSRF token not available');
      }
      
    } catch (error) {
      this.logFailure('Signin process test failed', error.message);
    }
  }

  async testAuthenticatedDashboardAccess() {
    console.log('\n📊 Step 4: Testing Authenticated Dashboard Access');
    
    try {
      const result = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} -w 'HTTP_CODE:%{http_code}\\n' '${this.baseUrl}/dashboard' | tail -1"`);
      
      if (result.stdout.includes('HTTP_CODE:200')) {
        this.logSuccess('Dashboard accessible with authentication');
        
        // Check dashboard content
        const contentResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} '${this.baseUrl}/dashboard' | grep -o 'Theocratic Shift Scheduler\\|Welcome back\\|Total Users\\|Total Events' | head -4"`);
        console.log('   Dashboard content:', contentResult.stdout.trim());
        
        if (contentResult.stdout.includes('Theocratic Shift Scheduler')) {
          this.logSuccess('Dashboard contains expected content');
        } else {
          this.logFailure('Dashboard content missing');
        }
      } else {
        this.logFailure('Dashboard not accessible with authentication');
      }
      
    } catch (error) {
      this.logFailure('Authenticated dashboard access test failed', error.message);
    }
  }

  async testAuthenticatedAPIAccess() {
    console.log('\n🔌 Step 5: Testing Authenticated API Access');
    
    try {
      // Test users API with session cookies
      const usersResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} '${this.baseUrl}/api/users'"`);
      console.log('   Users API response:', usersResult.stdout.trim());
      
      const usersData = JSON.parse(usersResult.stdout);
      if (usersData.success && usersData.data) {
        this.logSuccess('Users API accessible with authentication');
        console.log('   Users found:', usersData.data.length);
      } else {
        this.logFailure('Users API failed with authentication');
        console.log('   API Error:', usersData.error || 'Unknown error');
      }
      
      // Test events API with session cookies
      const eventsResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} '${this.baseUrl}/api/events'"`);
      console.log('   Events API response:', eventsResult.stdout.trim());
      
      const eventsData = JSON.parse(eventsResult.stdout);
      if (eventsData.success && eventsData.data) {
        this.logSuccess('Events API accessible with authentication');
        console.log('   Events found:', eventsData.data.length);
      } else {
        this.logFailure('Events API failed with authentication');
        console.log('   API Error:', eventsData.error || 'Unknown error');
      }
      
    } catch (error) {
      this.logFailure('Authenticated API access test failed', error.message);
    }
  }

  async testSessionPersistence() {
    console.log('\n🍪 Step 6: Testing Session Persistence');
    
    try {
      // Wait a moment then test session again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sessionResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} '${this.baseUrl}/api/auth/session'"`);
      const sessionData = JSON.parse(sessionResult.stdout);
      
      if (sessionData.user && sessionData.user.email) {
        this.logSuccess('Session persists across requests');
        
        // Test API call again
        const apiResult = await execAsync(`ssh ${this.stagingServer} "curl -s -b ${this.cookieJar} '${this.baseUrl}/api/users'"`);
        const apiData = JSON.parse(apiResult.stdout);
        
        if (apiData.success) {
          this.logSuccess('API calls work with persistent session');
        } else {
          this.logFailure('API calls fail with persistent session');
        }
      } else {
        this.logFailure('Session does not persist');
      }
      
    } catch (error) {
      this.logFailure('Session persistence test failed', error.message);
    }
  }

  async cleanupCookies() {
    try {
      await execAsync(`ssh ${this.stagingServer} "rm -f ${this.cookieJar}"`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  logSuccess(message, detail = '') {
    const result = `✅ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'success', message, detail });
  }

  logFailure(message, detail = '') {
    const result = `❌ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.failures.push({ message, detail });
  }

  generateE2EReport() {
    console.log('\n📊 WMACS Guardian E2E Authentication Test Report');
    console.log('=================================================');
    
    const successCount = this.testResults.filter(r => r.type === 'success').length;
    const failureCount = this.failures.length;
    
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    
    if (failureCount > 0) {
      console.log('\n🚨 AUTHENTICATION FAILURES:');
      this.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.message}${failure.detail ? ` (${failure.detail})` : ''}`);
      });
      
      console.log('\n🔧 WMACS Guardian Analysis:');
      
      const hasSigninIssues = this.failures.some(f => f.message.includes('Signin') || f.message.includes('CSRF'));
      const hasSessionIssues = this.failures.some(f => f.message.includes('session') || f.message.includes('Session'));
      const hasAPIIssues = this.failures.some(f => f.message.includes('API') || f.message.includes('api'));
      
      if (hasSigninIssues) {
        console.log('❌ SIGNIN PROCESS BROKEN - NextAuth configuration issue');
      }
      if (hasSessionIssues) {
        console.log('❌ SESSION MANAGEMENT BROKEN - Session storage/retrieval issue');
      }
      if (hasAPIIssues) {
        console.log('❌ API AUTHENTICATION BROKEN - getServerSession not working');
      }
      
    } else {
      console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED!');
      console.log('✅ Complete end-to-end authentication flow working');
      console.log('✅ Dashboard should load data successfully');
      console.log('✅ No more "Failed to fetch dashboard data" errors');
    }
    
    console.log('\n📋 Next Steps:');
    if (failureCount > 0) {
      console.log('- Fix the identified authentication issues');
      console.log('- Re-run this E2E test to verify fixes');
      console.log('- Check NextAuth configuration and session storage');
    } else {
      console.log('- Authentication is working correctly');
      console.log('- User can now sign in and access dashboard');
      console.log('- Dashboard will load real data from APIs');
    }
    
    // Cleanup
    this.cleanupCookies();
  }
}

// Run E2E authentication test
const e2eTester = new WMACSE2EAuthTest();
e2eTester.runE2EAuthTest().catch(console.error);
