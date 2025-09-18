const http = require('http');

// Configuration
const BASE_URL = 'http://10.92.3.24:3001';
const ADMIN_EMAIL = 'admin@jwattendant.com';
const ADMIN_PASSWORD = 'admin123';

// Allow self-signed certificates for staging
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

async function makeRequest(path, method = 'GET', data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JW-Auth-Test/1.0'
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          cookies: cookies
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

function extractAuthToken(cookies) {
  for (const cookie of cookies) {
    if (cookie.startsWith('auth-token=')) {
      return cookie.split(';')[0];
    }
  }
  return null;
}

async function testNewAuthentication() {
  console.log('🔍 Testing New JWT Authentication System');
  console.log('=====================================\n');

  let authCookie = '';
  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}`);
    if (details) console.log(`   ${details}`);
    
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
  }

  try {
    // Test 1: Login with valid credentials
    console.log('1. Testing login with valid credentials...');
    const loginResponse = await makeRequest('/api/auth/login', 'POST', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (loginResponse.statusCode === 200) {
      const loginData = JSON.parse(loginResponse.body);
      authCookie = extractAuthToken(loginResponse.cookies);
      
      logTest('Login API', true, `User: ${loginData.user?.email}, Role: ${loginData.user?.role}`);
      
      if (authCookie) {
        logTest('Auth Cookie Set', true, 'JWT token received in cookie');
      } else {
        logTest('Auth Cookie Set', false, 'No auth token in response cookies');
      }
    } else {
      logTest('Login API', false, `Status: ${loginResponse.statusCode}, Body: ${loginResponse.body}`);
    }

    // Test 2: Test /api/auth/me endpoint
    if (authCookie) {
      console.log('\n2. Testing user info retrieval...');
      const meResponse = await makeRequest('/api/auth/me', 'GET', null, authCookie);
      
      if (meResponse.statusCode === 200) {
        const userData = JSON.parse(meResponse.body);
        logTest('User Info API', true, `Retrieved user: ${userData.user?.email}`);
      } else {
        logTest('User Info API', false, `Status: ${meResponse.statusCode}, Body: ${meResponse.body}`);
      }
    }

    // Test 3: Test protected route access
    if (authCookie) {
      console.log('\n3. Testing protected route access...');
      const dashboardResponse = await makeRequest('/dashboard', 'GET', null, authCookie);
      
      if (dashboardResponse.statusCode === 200 || dashboardResponse.statusCode === 302) {
        logTest('Protected Route Access', true, `Dashboard accessible with auth cookie`);
      } else {
        logTest('Protected Route Access', false, `Status: ${dashboardResponse.statusCode}`);
      }
    }

    // Test 4: Test invalid credentials
    console.log('\n4. Testing login with invalid credentials...');
    const invalidLoginResponse = await makeRequest('/api/auth/login', 'POST', {
      email: ADMIN_EMAIL,
      password: 'wrongpassword'
    });

    if (invalidLoginResponse.statusCode === 401) {
      logTest('Invalid Login Rejection', true, 'Correctly rejected invalid credentials');
    } else {
      logTest('Invalid Login Rejection', false, `Status: ${invalidLoginResponse.statusCode}`);
    }

    // Test 5: Test logout
    if (authCookie) {
      console.log('\n5. Testing logout...');
      const logoutResponse = await makeRequest('/api/auth/logout', 'POST', null, authCookie);
      
      if (logoutResponse.statusCode === 200) {
        logTest('Logout API', true, 'Logout successful');
        
        // Test 6: Verify session is cleared
        console.log('\n6. Testing session cleared after logout...');
        const postLogoutResponse = await makeRequest('/api/auth/me', 'GET', null, authCookie);
        
        if (postLogoutResponse.statusCode === 401) {
          logTest('Session Cleared', true, 'Session properly invalidated after logout');
        } else {
          logTest('Session Cleared', false, `Status: ${postLogoutResponse.statusCode}`);
        }
      } else {
        logTest('Logout API', false, `Status: ${logoutResponse.statusCode}`);
      }
    }

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    testResults.failed++;
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All authentication tests passed! New JWT system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }

  return testResults.failed === 0;
}

// Run the test
if (require.main === module) {
  testNewAuthentication()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testNewAuthentication };
