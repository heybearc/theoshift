#!/usr/bin/env node

/**
 * Authenticated Testing Script for JW Attendant Scheduler
 * Tests functionality that requires authentication using admin credentials
 */

const http = require('http');
const querystring = require('querystring');

const BASE_URL = 'http://10.92.3.24:3001';
const ADMIN_CREDENTIALS = {
  email: 'admin@jwscheduler.local',
  password: 'AdminPass123!'
};

let sessionCookie = null;

function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    if (data && method !== 'GET') {
      const postData = typeof data === 'string' ? data : JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        // Capture session cookies
        if (res.headers['set-cookie']) {
          const cookies = res.headers['set-cookie'];
          const sessionCookies = cookies.filter(cookie => 
            cookie.includes('next-auth.session-token') || 
            cookie.includes('__Secure-next-auth.session-token')
          );
          if (sessionCookies.length > 0) {
            sessionCookie = sessionCookies.join('; ');
          }
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
          redirectLocation: res.headers.location
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data && method !== 'GET') {
      const postData = typeof data === 'string' ? data : JSON.stringify(data);
      req.write(postData);
    }

    req.end();
  });
}

async function authenticateUser() {
  console.log('🔐 Authenticating with admin credentials...');
  
  try {
    // Get CSRF token from NextAuth
    const csrfResponse = await makeRequest(`${BASE_URL}/api/auth/csrf`);
    console.log(`  🎫 CSRF endpoint: ${csrfResponse.statusCode}`);
    
    if (csrfResponse.statusCode !== 200) {
      throw new Error('Could not get CSRF token from API');
    }
    
    const csrfData = JSON.parse(csrfResponse.body);
    const csrfToken = csrfData.csrfToken;
    
    if (!csrfToken) {
      throw new Error('CSRF token not found in response');
    }
    
    console.log(`  🎫 CSRF Token: ${csrfToken.substring(0, 20)}...`);
    
    // Perform login using NextAuth signin endpoint
    const loginData = {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      csrfToken: csrfToken,
      callbackUrl: `${BASE_URL}/admin`,
      json: true
    };
    
    const loginResponse = await makeRequest(
      `${BASE_URL}/api/auth/signin/credentials`,
      'POST',
      loginData
    );
    
    console.log(`  🔑 Login response: ${loginResponse.statusCode}`);
    
    // Check if we got redirected (successful login)
    if (loginResponse.statusCode === 200 || loginResponse.statusCode === 302) {
      console.log(`  ✅ Login request processed`);
    }
    
    // Check session after login attempt
    const sessionCheck = await makeRequest(`${BASE_URL}/api/auth/session`);
    console.log(`  📊 Session check: ${sessionCheck.statusCode}`);
    
    if (sessionCheck.statusCode === 200) {
      const session = JSON.parse(sessionCheck.body);
      if (session.user) {
        console.log(`  ✅ Session established for: ${session.user.email} (${session.user.role})`);
        return true;
      } else {
        console.log(`  ⚠️  Empty session: ${sessionCheck.body}`);
      }
    }
    
    return false;
    
  } catch (error) {
    console.log(`  ❌ Authentication failed: ${error.message}`);
    return false;
  }
}

async function testAuthenticatedEndpoints() {
  console.log('\n🧪 Testing Authenticated Endpoints');
  console.log('='.repeat(50));
  
  const endpoints = [
    { path: '/api/auth/session', name: 'Session Check' },
    { path: '/api/admin/users', name: 'Admin Users API' },
    { path: '/api/attendants', name: 'Attendants API' },
    { path: '/api/events', name: 'Events API' },
    { path: '/api/counts/analytics', name: 'Analytics API' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`  Testing: ${endpoint.name}`);
      const response = await makeRequest(`${BASE_URL}${endpoint.path}`);
      
      let status = '❌ FAIL';
      let details = `Status: ${response.statusCode}`;
      
      if (response.statusCode === 200) {
        status = '✅ PASS';
        try {
          const data = JSON.parse(response.body);
          if (Array.isArray(data)) {
            details = `Status: 200, Items: ${data.length}`;
          } else if (data.user) {
            details = `Status: 200, User: ${data.user.email}`;
          } else {
            details = `Status: 200, Data: ${Object.keys(data).join(', ')}`;
          }
        } catch (e) {
          details = `Status: 200, Length: ${response.body.length}`;
        }
      } else if (response.statusCode === 307) {
        status = '⚠️  REDIRECT';
        details = `Redirects to: ${response.redirectLocation}`;
      }
      
      console.log(`    ${status} - ${details}`);
      
      results.push({
        endpoint: endpoint.path,
        name: endpoint.name,
        statusCode: response.statusCode,
        success: response.statusCode === 200,
        details: details
      });
      
    } catch (error) {
      console.log(`    ❌ ERROR - ${error.message}`);
      results.push({
        endpoint: endpoint.path,
        name: endpoint.name,
        error: error.message,
        success: false
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

async function testPageAccess() {
  console.log('\n🌐 Testing Page Access');
  console.log('='.repeat(50));
  
  const pages = [
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/attendants', name: 'Attendants Page' },
    { path: '/events', name: 'Events Page' },
    { path: '/dashboard', name: 'User Dashboard' }
  ];
  
  const results = [];
  
  for (const page of pages) {
    try {
      console.log(`  Testing: ${page.name}`);
      const response = await makeRequest(`${BASE_URL}${page.path}`);
      
      let status = '❌ FAIL';
      let details = `Status: ${response.statusCode}`;
      
      if (response.statusCode === 200) {
        status = '✅ PASS';
        const hasTitle = response.body.includes('<title>');
        const hasReact = response.body.includes('__NEXT_DATA__');
        details = `Status: 200, Title: ${hasTitle}, React: ${hasReact}`;
      } else if (response.statusCode === 307) {
        status = '⚠️  REDIRECT';
        details = `Redirects to: ${response.redirectLocation}`;
      }
      
      console.log(`    ${status} - ${details}`);
      
      results.push({
        page: page.path,
        name: page.name,
        statusCode: response.statusCode,
        success: response.statusCode === 200,
        details: details
      });
      
    } catch (error) {
      console.log(`    ❌ ERROR - ${error.message}`);
      results.push({
        page: page.path,
        name: page.name,
        error: error.message,
        success: false
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

async function runAuthenticatedTests() {
  console.log('🚀 Starting Authenticated Testing');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  // Step 1: Authenticate
  const authSuccess = await authenticateUser();
  if (!authSuccess) {
    console.log('\n❌ Authentication failed. Cannot proceed with authenticated tests.');
    return;
  }
  
  // Step 2: Test API endpoints
  const apiResults = await testAuthenticatedEndpoints();
  
  // Step 3: Test page access
  const pageResults = await testPageAccess();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Calculate results
  const totalTests = apiResults.length + pageResults.length;
  const passedTests = [...apiResults, ...pageResults].filter(r => r.success).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 AUTHENTICATED TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`📊 Total: ${totalTests}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  // Detailed breakdown
  console.log('\n📋 DETAILED RESULTS:');
  console.log('\n  API Endpoints:');
  apiResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`    ${status} ${result.name}: ${result.details || result.error}`);
  });
  
  console.log('\n  Page Access:');
  pageResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`    ${status} ${result.name}: ${result.details || result.error}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  return { apiResults, pageResults, totalTests, passedTests, successRate };
}

// Run tests if called directly
if (require.main === module) {
  runAuthenticatedTests().catch(console.error);
}

module.exports = { runAuthenticatedTests };
