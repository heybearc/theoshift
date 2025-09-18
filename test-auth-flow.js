#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = 'http://10.92.3.24:3001';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'JW-Attendant-Test/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAuthFlow() {
  console.log('🔍 Testing NextAuth flow on staging...\n');
  
  try {
    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await makeRequest(`${BASE_URL}/api/auth/csrf`);
    console.log(`   Status: ${csrfResponse.statusCode}`);
    
    if (csrfResponse.statusCode !== 200) {
      console.log('❌ Failed to get CSRF token');
      return;
    }
    
    const csrfData = JSON.parse(csrfResponse.body);
    const csrfToken = csrfData.csrfToken;
    console.log(`   CSRF Token: ${csrfToken.substring(0, 20)}...`);
    
    // Step 2: Test signin page
    console.log('\n2. Testing signin page...');
    const signinResponse = await makeRequest(`${BASE_URL}/auth/signin`);
    console.log(`   Status: ${signinResponse.statusCode}`);
    console.log(`   Content length: ${signinResponse.body.length}`);
    
    // Step 3: Test providers endpoint
    console.log('\n3. Testing providers...');
    const providersResponse = await makeRequest(`${BASE_URL}/api/auth/providers`);
    console.log(`   Status: ${providersResponse.statusCode}`);
    console.log(`   Providers: ${providersResponse.body}`);
    
    // Step 4: Test session endpoint (should be empty)
    console.log('\n4. Testing session (unauthenticated)...');
    const sessionResponse = await makeRequest(`${BASE_URL}/api/auth/session`);
    console.log(`   Status: ${sessionResponse.statusCode}`);
    console.log(`   Session: ${sessionResponse.body}`);
    
    // Step 5: Attempt login
    console.log('\n5. Attempting login...');
    const loginData = new URLSearchParams({
      email: 'admin@jwscheduler.local',
      password: 'AdminPass123!',
      csrfToken: csrfToken,
      callbackUrl: `${BASE_URL}/dashboard`,
      json: 'true'
    }).toString();
    
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': loginData.length
      },
      body: loginData
    });
    
    console.log(`   Status: ${loginResponse.statusCode}`);
    console.log(`   Headers: ${JSON.stringify(loginResponse.headers, null, 2)}`);
    console.log(`   Cookies: ${loginResponse.cookies}`);
    console.log(`   Body: ${loginResponse.body.substring(0, 200)}...`);
    
    // Extract session cookie if present
    let sessionCookie = '';
    loginResponse.cookies.forEach(cookie => {
      if (cookie.includes('next-auth.session-token')) {
        sessionCookie = cookie.split(';')[0];
        console.log(`   Session cookie: ${sessionCookie}`);
      }
    });
    
    // Step 6: Test session with cookie
    if (sessionCookie) {
      console.log('\n6. Testing session with cookie...');
      const authenticatedSessionResponse = await makeRequest(`${BASE_URL}/api/auth/session`, {
        headers: {
          'Cookie': sessionCookie
        }
      });
      console.log(`   Status: ${authenticatedSessionResponse.statusCode}`);
      console.log(`   Session: ${authenticatedSessionResponse.body}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAuthFlow();
