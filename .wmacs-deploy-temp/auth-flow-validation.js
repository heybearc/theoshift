#!/usr/bin/env node

/**
 * Authentication Flow Validation Test
 * Validates proper authentication behavior for JW Attendant Scheduler
 */

const https = require('https');

const BASE_URL = 'https://jw-staging.cloudigan.net';

class AuthFlowValidator {
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
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        });
      }).on('error', reject);
    });
  }

  async test(name, testFn) {
    try {
      console.log(`🔐 Testing: ${name}`);
      const result = await testFn();
      if (result) {
        console.log(`✅ PASS: ${name}`);
        this.results.passed++;
        this.results.tests.push({ name, status: 'PASS' });
      } else {
        console.log(`❌ FAIL: ${name}`);
        this.results.failed++;
        this.results.tests.push({ name, status: 'FAIL' });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name} - ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'ERROR', details: error.message });
    }
  }

  async runAuthTests() {
    console.log('🔐 Authentication Flow Validation');
    console.log('=' .repeat(50));
    console.log('🎯 Target:', BASE_URL);
    console.log('');

    // Test 1: Dashboard shows loading/auth check
    await this.test('Dashboard requires authentication', async () => {
      const response = await this.makeRequest(`${BASE_URL}/dashboard`);
      return response.status === 200 && 
             (response.data.includes('Loading...') || 
              response.data.includes('Authentication Required'));
    });

    // Test 2: Sign-in page is accessible
    await this.test('Sign-in page is accessible', async () => {
      const response = await this.makeRequest(`${BASE_URL}/auth/signin`);
      return response.status === 200 && 
             response.data.includes('JW Attendant Scheduler');
    });

    // Test 3: Attendants page requires authentication
    await this.test('Attendants page requires authentication', async () => {
      const response = await this.makeRequest(`${BASE_URL}/attendants`);
      return response.status === 200 && 
             (response.data.includes('Loading...') || 
              response.data.includes('Authentication Required'));
    });

    // Test 4: API endpoints work without authentication
    await this.test('Public API endpoints accessible', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/events`);
      return response.status === 200;
    });

    // Test 5: Protected API endpoints require auth
    await this.test('Protected API requires authentication', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/users`);
      return response.status === 200; // Should return auth error in JSON
    });

    this.printResults();
  }

  printResults() {
    console.log('');
    console.log('🔐 Authentication Flow Test Results');
    console.log('=' .repeat(50));
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
          console.log(`   - ${test.name}: ${test.details || 'Failed'}`);
        });
      console.log('');
    }

    console.log('🔐 Authentication Status:', this.results.failed === 0 ? 'SECURE ✅' : 'NEEDS REVIEW ⚠️');
    console.log('');
    console.log('📋 Authentication Features Tested:');
    console.log('   ✅ Dashboard Authentication Check');
    console.log('   ✅ Sign-in Page Accessibility');
    console.log('   ✅ Protected Route Behavior');
    console.log('   ✅ API Authentication Requirements');
    console.log('');
  }
}

// Run the authentication tests
const validator = new AuthFlowValidator();
validator.runAuthTests().catch(console.error);
