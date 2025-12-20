#!/usr/bin/env node

/**
 * URL Consistency Test
 * Validates that all URLs maintain the FQDN and don't switch to IP addresses
 */

const https = require('https');

const BASE_URL = 'https://blue.theoshift.com';
const IP_ADDRESS = '10.92.3.24';

class URLConsistencyTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ 
            status: res.statusCode, 
            data: data, 
            headers: res.headers,
            url: res.url 
          });
        });
      }).on('error', reject);
    });
  }

  async test(name, testFn) {
    try {
      console.log(`🔗 Testing: ${name}`);
      const result = await testFn();
      if (result.success) {
        console.log(`✅ PASS: ${name}`);
        this.results.passed++;
        this.results.tests.push({ name, status: 'PASS', details: result.details });
      } else {
        console.log(`❌ FAIL: ${name} - ${result.details}`);
        this.results.failed++;
        this.results.tests.push({ name, status: 'FAIL', details: result.details });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name} - ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'ERROR', details: error.message });
    }
  }

  checkForIPAddresses(content, context) {
    const ipMatches = content.match(new RegExp(IP_ADDRESS, 'g'));
    if (ipMatches) {
      return {
        success: false,
        details: `Found ${ipMatches.length} instances of IP address ${IP_ADDRESS} in ${context}`
      };
    }
    return {
      success: true,
      details: `No IP addresses found in ${context}`
    };
  }

  async runURLConsistencyTests() {
    console.log('🔗 URL Consistency Testing Framework');
    console.log('=' .repeat(60));
    console.log('🎯 Target:', BASE_URL);
    console.log('🚫 Checking for IP leakage:', IP_ADDRESS);
    console.log('');

    // Test 1: Dashboard content doesn't contain IP addresses
    await this.test('Dashboard content uses FQDN only', async () => {
      const response = await this.makeRequest(`${BASE_URL}/dashboard`);
      if (response.status !== 200) {
        return { success: false, details: `HTTP ${response.status}` };
      }
      return this.checkForIPAddresses(response.data, 'dashboard HTML');
    });

    // Test 2: NextAuth providers use FQDN
    await this.test('NextAuth providers use FQDN', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/auth/providers`);
      if (response.status !== 200) {
        return { success: false, details: `HTTP ${response.status}` };
      }
      
      const providers = JSON.parse(response.data);
      const credentialsProvider = providers.credentials;
      
      if (credentialsProvider.signinUrl.includes(IP_ADDRESS) || 
          credentialsProvider.callbackUrl.includes(IP_ADDRESS)) {
        return {
          success: false,
          details: 'NextAuth URLs contain IP address instead of FQDN'
        };
      }
      
      return {
        success: true,
        details: 'NextAuth URLs use FQDN correctly'
      };
    });

    // Test 3: API responses don't leak IP addresses
    await this.test('API responses use relative URLs', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/events`);
      if (response.status !== 200) {
        return { success: false, details: `HTTP ${response.status}` };
      }
      return this.checkForIPAddresses(response.data, 'API response');
    });

    // Test 4: Attendants page content consistency
    await this.test('Attendants page uses FQDN only', async () => {
      const response = await this.makeRequest(`${BASE_URL}/attendants`);
      if (response.status !== 200) {
        return { success: false, details: `HTTP ${response.status}` };
      }
      return this.checkForIPAddresses(response.data, 'attendants page HTML');
    });

    // Test 5: NextAuth session endpoint
    await this.test('NextAuth session endpoint consistency', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/auth/session`);
      if (response.status !== 200) {
        return { success: false, details: `HTTP ${response.status}` };
      }
      return this.checkForIPAddresses(response.data, 'session API response');
    });

    // Test 6: Check response headers for consistency
    await this.test('Response headers use FQDN', async () => {
      const response = await this.makeRequest(`${BASE_URL}/dashboard`);
      if (response.status !== 200) {
        return { success: false, details: `HTTP ${response.status}` };
      }
      
      // Check if X-Served-By header contains FQDN
      const servedBy = response.headers['x-served-by'];
      if (servedBy && servedBy.includes('blue.theoshift.com')) {
        return {
          success: true,
          details: `X-Served-By header correctly shows: ${servedBy}`
        };
      }
      
      return {
        success: false,
        details: `X-Served-By header issue: ${servedBy}`
      };
    });

    // Test 7: Security headers are present
    await this.test('Security headers are applied', async () => {
      const response = await this.makeRequest(`${BASE_URL}/dashboard`);
      if (response.status !== 200) {
        return { success: false, details: `HTTP ${response.status}` };
      }
      
      const hasFrameOptions = response.headers['x-frame-options'] === 'DENY';
      const hasContentTypeOptions = response.headers['x-content-type-options'] === 'nosniff';
      
      if (hasFrameOptions && hasContentTypeOptions) {
        return {
          success: true,
          details: 'Security headers properly configured'
        };
      }
      
      return {
        success: false,
        details: 'Missing security headers'
      };
    });

    this.printResults();
  }

  printResults() {
    console.log('');
    console.log('🔗 URL Consistency Test Results');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total: ${this.results.passed + this.results.failed}`);
    console.log(`🎯 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    console.log('');

    if (this.results.failed > 0) {
      console.log('❌ Failed Tests:');
      this.results.tests
        .filter(t => t.status !== 'PASS')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.details}`);
        });
      console.log('');
    }

    console.log('🔗 URL Consistency Status:', this.results.failed === 0 ? 'CONSISTENT ✅' : 'NEEDS ATTENTION ⚠️');
    console.log('');
    console.log('📋 URL Consistency Features Tested:');
    console.log('   ✅ Dashboard FQDN Consistency');
    console.log('   ✅ NextAuth URL Configuration');
    console.log('   ✅ API Response URL Consistency');
    console.log('   ✅ Security Headers Implementation');
    console.log('   ✅ Response Header Validation');
    console.log('');

    if (this.results.failed === 0) {
      console.log('🎉 SUCCESS: All URLs maintain FQDN consistency!');
      console.log('   Users will no longer see IP addresses in the URL bar');
      console.log('   Navigation between pages maintains domain consistency');
      console.log('   NextAuth authentication flows use proper domain');
    }
  }
}

// Run the URL consistency tests
const tester = new URLConsistencyTester();
tester.runURLConsistencyTests().catch(console.error);
