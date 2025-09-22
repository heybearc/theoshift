#!/usr/bin/env node

// WMACS Guardian: Authentication Flow Diagnosis
// Comprehensive analysis of authentication redirect and API access issues

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSAuthFlowDiagnosis {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.issues = [];
    this.findings = [];
  }

  async runComprehensiveDiagnosis() {
    console.log('🔍 WMACS Guardian: Comprehensive Authentication Flow Diagnosis...\n');
    
    // Test 1: Root Page Redirect Behavior
    await this.testRootPageRedirect();
    
    // Test 2: Dashboard Authentication Check
    await this.testDashboardAuthentication();
    
    // Test 3: API Endpoint Accessibility
    await this.testAPIEndpointAccess();
    
    // Test 4: NextAuth Configuration
    await this.testNextAuthConfiguration();
    
    // Test 5: Session Handling
    await this.testSessionHandling();
    
    // Test 6: Client-Side Fetch Issues
    await this.testClientSideFetch();
    
    this.generateDiagnosisReport();
  }

  async testRootPageRedirect() {
    console.log('🏠 Testing Root Page Redirect Behavior');
    
    try {
      // Test root page response
      const result = await execAsync(`ssh jws "curl -s -L -w 'FINAL_URL:%{url_effective}\\nHTTP:%{http_code}' '${this.baseUrl}/' | tail -2"`);
      
      console.log('   Root page response:', result.stdout.trim());
      
      if (result.stdout.includes('HTTP:200')) {
        this.logFinding('Root page loads successfully');
        
        // Check if it contains redirect logic
        const contentResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/' | grep -o 'useRouter\\|router.push\\|Redirecting' | head -3"`);
        if (contentResult.stdout.length > 0) {
          this.logFinding('Root page contains redirect logic', contentResult.stdout.trim());
        } else {
          this.logIssue('Root page may not have proper redirect logic');
        }
      } else {
        this.logIssue('Root page not loading correctly', result.stdout);
      }
    } catch (error) {
      this.logIssue('Root page test failed', error.message);
    }
  }

  async testDashboardAuthentication() {
    console.log('\n📊 Testing Dashboard Authentication Check');
    
    try {
      // Test dashboard page without authentication
      const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/dashboard' | tail -1"`);
      
      console.log('   Dashboard response:', result.stdout.trim());
      
      if (result.stdout.includes('HTTP:200')) {
        this.logFinding('Dashboard page loads');
        
        // Check if dashboard contains authentication check
        const authCheckResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/dashboard' | grep -o 'useSession\\|getSession\\|session' | head -3"`);
        if (authCheckResult.stdout.length > 0) {
          this.logFinding('Dashboard contains session checks', authCheckResult.stdout.trim());
        } else {
          this.logIssue('Dashboard may not have proper authentication checks');
        }
      } else {
        this.logIssue('Dashboard page not accessible', result.stdout);
      }
    } catch (error) {
      this.logIssue('Dashboard authentication test failed', error.message);
    }
  }

  async testAPIEndpointAccess() {
    console.log('\n🔌 Testing API Endpoint Access');
    
    const endpoints = [
      { path: '/api/users', name: 'Users API' },
      { path: '/api/events', name: 'Events API' }
    ];

    for (const endpoint of endpoints) {
      try {
        const result = await execAsync(`ssh jws "curl -s '${this.baseUrl}${endpoint.path}'"`);
        const response = JSON.parse(result.stdout);
        
        if (response.success === false && response.error === 'Authentication required') {
          this.logFinding(`${endpoint.name} properly requires authentication`);
        } else {
          this.logIssue(`${endpoint.name} authentication behavior unexpected`, JSON.stringify(response));
        }
      } catch (error) {
        this.logIssue(`${endpoint.name} test failed`, error.message);
      }
    }
  }

  async testNextAuthConfiguration() {
    console.log('\n🔐 Testing NextAuth Configuration');
    
    try {
      // Test NextAuth providers endpoint
      const providersResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/api/auth/providers'"`);
      const providers = JSON.parse(providersResult.stdout);
      
      if (providers.credentials) {
        this.logFinding('NextAuth credentials provider configured');
      } else {
        this.logIssue('NextAuth credentials provider not found');
      }
      
      // Test CSRF endpoint
      const csrfResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/api/auth/csrf'"`);
      const csrf = JSON.parse(csrfResult.stdout);
      
      if (csrf.csrfToken) {
        this.logFinding('NextAuth CSRF token available');
      } else {
        this.logIssue('NextAuth CSRF token not available');
      }
      
      // Test session endpoint
      const sessionResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/api/auth/session'"`);
      console.log('   Session endpoint response:', sessionResult.stdout.trim());
      
    } catch (error) {
      this.logIssue('NextAuth configuration test failed', error.message);
    }
  }

  async testSessionHandling() {
    console.log('\n🍪 Testing Session Handling');
    
    try {
      // Test if session cookies are being set
      const cookieResult = await execAsync(`ssh jws "curl -s -I '${this.baseUrl}/api/auth/session' | grep -i 'set-cookie\\|cookie'"`);
      
      if (cookieResult.stdout.length > 0) {
        this.logFinding('Session cookies being handled', cookieResult.stdout.trim());
      } else {
        this.logFinding('No session cookies detected (expected for unauthenticated)');
      }
    } catch (error) {
      this.logIssue('Session handling test failed', error.message);
    }
  }

  async testClientSideFetch() {
    console.log('\n🌐 Testing Client-Side Fetch Issues');
    
    try {
      // Check if the dashboard page contains fetch calls
      const fetchResult = await execAsync(`ssh jws "curl -s '${this.baseUrl}/dashboard' | grep -o 'fetch.*api\\|/api/users\\|/api/events' | head -5"`);
      
      if (fetchResult.stdout.length > 0) {
        this.logFinding('Dashboard contains API fetch calls', fetchResult.stdout.trim());
        
        // This suggests the issue might be client-side authentication
        this.logIssue('POTENTIAL ISSUE: Client-side fetch may not include authentication headers');
        this.logIssue('POTENTIAL ISSUE: Browser may be blocking unauthenticated API calls');
      } else {
        this.logIssue('Dashboard may not contain expected API calls');
      }
    } catch (error) {
      this.logIssue('Client-side fetch test failed', error.message);
    }
  }

  logFinding(message, detail = '') {
    const result = `✅ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.findings.push({ message, detail });
  }

  logIssue(message, detail = '') {
    const result = `❌ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.issues.push({ message, detail });
  }

  generateDiagnosisReport() {
    console.log('\n📊 WMACS Authentication Flow Diagnosis Report');
    console.log('=============================================');
    
    console.log(`✅ Findings: ${this.findings.length}`);
    console.log(`❌ Issues: ${this.issues.length}`);
    
    if (this.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.message}${issue.detail ? ` (${issue.detail})` : ''}`);
      });
    }
    
    console.log('\n🎯 WMACS Guardian Root Cause Analysis:');
    
    // Analyze the pattern of issues
    const hasAPIAuthIssues = this.issues.some(i => i.message.includes('API') || i.message.includes('fetch'));
    const hasRedirectIssues = this.issues.some(i => i.message.includes('redirect') || i.message.includes('Root page'));
    const hasSessionIssues = this.issues.some(i => i.message.includes('session') || i.message.includes('authentication'));
    
    if (hasAPIAuthIssues) {
      console.log('❌ PRIMARY ISSUE: Client-side API authentication problem');
      console.log('   - Dashboard tries to fetch API data without authentication');
      console.log('   - Browser fetch() calls don\'t include session cookies automatically');
      console.log('   - Need to configure fetch with credentials: "include"');
    }
    
    if (hasRedirectIssues) {
      console.log('❌ SECONDARY ISSUE: Authentication redirect flow');
      console.log('   - Root page may not properly redirect unauthenticated users');
      console.log('   - Dashboard may load before authentication check completes');
    }
    
    console.log('\n🔧 WMACS Guardian Recommended Fixes:');
    console.log('1. Add credentials: "include" to all fetch() calls in dashboard');
    console.log('2. Add proper loading states while authentication is being checked');
    console.log('3. Ensure useSession() hook is properly handling loading state');
    console.log('4. Add error boundaries for API fetch failures');
    
    console.log('\n📋 Next Steps:');
    console.log('- Fix client-side fetch authentication');
    console.log('- Test authentication flow end-to-end');
    console.log('- Verify session handling in browser');
    console.log('- Add proper error handling for API failures');
  }
}

// Run comprehensive diagnosis
const diagnosis = new WMACSAuthFlowDiagnosis();
diagnosis.runComprehensiveDiagnosis().catch(console.error);
