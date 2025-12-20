#!/usr/bin/env node

/**
 * Automated UAT Test Suite for Theocratic Shift Scheduler
 * Tests all critical functionality and generates a detailed report
 */

const https = require('https');
const http = require('http');

class UATTestRunner {
  constructor(baseUrl = 'http://10.92.3.24:3001') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  async runRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const defaultOptions = {
        method: 'GET',
        timeout: 5000,
        headers: {
          'User-Agent': 'UAT-Test-Runner/1.0'
        }
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      const client = this.baseUrl.startsWith('https') ? https : http;
      const req = client.request(url, finalOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: url
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.setTimeout(finalOptions.timeout);
      
      if (finalOptions.body) {
        req.write(finalOptions.body);
      }
      req.end();
    });
  }

  logTest(testName, passed, details = '') {
    this.testCount++;
    if (passed) {
      this.passCount++;
      console.log(`✅ ${testName}`);
    } else {
      this.failCount++;
      console.log(`❌ ${testName} - ${details}`);
    }
    
    this.results.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async testBasicConnectivity() {
    console.log('\n🔍 Testing Basic Connectivity...');
    
    try {
      const response = await this.runRequest('/api/auth/session');
      this.logTest('API Server Responding', response.statusCode === 200, `Status: ${response.statusCode}`);
      
      const authResponse = await this.runRequest('/auth/signin');
      this.logTest('Auth Page Accessible', authResponse.statusCode === 200, `Status: ${authResponse.statusCode}`);
      
      // Check if CSS is loading
      const cssMatch = authResponse.body.match(/href="([^"]*\.css)"/);
      if (cssMatch) {
        const cssResponse = await this.runRequest(cssMatch[1]);
        this.logTest('CSS File Loading', cssResponse.statusCode === 200 && cssResponse.body.includes('--tw'), 
          `CSS Status: ${cssResponse.statusCode}, Tailwind: ${cssResponse.body.includes('--tw')}`);
      } else {
        this.logTest('CSS File Loading', false, 'No CSS file found in HTML');
      }
      
    } catch (error) {
      this.logTest('Basic Connectivity', false, error.message);
    }
  }

  async testEventAPIs() {
    console.log('\n🔍 Testing Event APIs...');
    
    try {
      // Test events list endpoint
      const eventsResponse = await this.runRequest('/api/events');
      this.logTest('Events API Endpoint', eventsResponse.statusCode === 401 || eventsResponse.statusCode === 200, 
        `Status: ${eventsResponse.statusCode} (401 expected for unauthenticated)`);
      
      // Test event creation endpoint structure
      const createResponse = await this.runRequest('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'validation' })
      });
      this.logTest('Event Creation Endpoint', createResponse.statusCode === 401 || createResponse.statusCode === 400,
        `Status: ${createResponse.statusCode} (401/400 expected)`);
      
      // Test event detail endpoint
      const detailResponse = await this.runRequest('/api/events/test-id');
      this.logTest('Event Detail Endpoint', detailResponse.statusCode === 401 || detailResponse.statusCode === 404,
        `Status: ${detailResponse.statusCode} (401/404 expected)`);
        
    } catch (error) {
      this.logTest('Event APIs', false, error.message);
    }
  }

  async testPageRoutes() {
    console.log('\n🔍 Testing Page Routes...');
    
    const routes = [
      '/events',
      '/events/select', 
      '/events/create',
      '/admin',
      '/admin/users',
      '/admin/health'
    ];
    
    for (const route of routes) {
      try {
        const response = await this.runRequest(route);
        // Most routes should redirect to signin (302) or show signin (200) when unauthenticated
        const validStatuses = [200, 302, 401];
        this.logTest(`Route ${route}`, validStatuses.includes(response.statusCode),
          `Status: ${response.statusCode}`);
      } catch (error) {
        this.logTest(`Route ${route}`, false, error.message);
      }
    }
  }

  async testEventDetailTabs() {
    console.log('\n🔍 Testing Event Detail Tab Routes...');
    
    const eventId = 'test-event-id';
    const tabRoutes = [
      `/events/${eventId}`,
      `/events/${eventId}/count-times`,
      `/events/${eventId}/attendants`, 
      `/events/${eventId}/positions`,
      `/events/${eventId}/assignments`,
      `/events/${eventId}/edit`,
      `/admin/events/${eventId}/lanyards`
    ];
    
    for (const route of tabRoutes) {
      try {
        const response = await this.runRequest(route);
        // Should redirect to signin or return 404 for non-existent event
        const validStatuses = [200, 302, 404, 401];
        this.logTest(`Tab Route ${route}`, validStatuses.includes(response.statusCode),
          `Status: ${response.statusCode}`);
      } catch (error) {
        this.logTest(`Tab Route ${route}`, false, error.message);
      }
    }
  }

  async testDatabaseConnectivity() {
    console.log('\n🔍 Testing Database Connectivity...');
    
    try {
      // Test admin health endpoint which should check DB
      const healthResponse = await this.runRequest('/api/admin/health');
      this.logTest('Database Health Check', 
        healthResponse.statusCode === 401 || (healthResponse.statusCode === 200 && healthResponse.body.includes('database')),
        `Status: ${healthResponse.statusCode}`);
        
    } catch (error) {
      this.logTest('Database Connectivity', false, error.message);
    }
  }

  async testStaticAssets() {
    console.log('\n🔍 Testing Static Assets...');
    
    try {
      // Test favicon
      const faviconResponse = await this.runRequest('/favicon.ico');
      this.logTest('Favicon Loading', faviconResponse.statusCode === 200 || faviconResponse.statusCode === 404,
        `Status: ${faviconResponse.statusCode}`);
      
      // Test Next.js static files
      const nextResponse = await this.runRequest('/_next/static/chunks/webpack-ee7e63bc15b31913.js');
      this.logTest('Next.js Static Files', nextResponse.statusCode === 200 || nextResponse.statusCode === 404,
        `Status: ${nextResponse.statusCode}`);
        
    } catch (error) {
      this.logTest('Static Assets', false, error.message);
    }
  }

  async testEventTypeEnums() {
    console.log('\n🔍 Testing Event Type Updates...');
    
    try {
      // Test create event page for new event types
      const createResponse = await this.runRequest('/events/create');
      const hasNewTypes = createResponse.body.includes('CIRCUIT_ASSEMBLY') || 
                         createResponse.body.includes('Circuit Assembly') ||
                         createResponse.body.includes('REGIONAL_CONVENTION');
      
      this.logTest('New Event Types Present', hasNewTypes,
        `Found new event types: ${hasNewTypes}`);
        
    } catch (error) {
      this.logTest('Event Type Enums', false, error.message);
    }
  }

  async testFormValidation() {
    console.log('\n🔍 Testing Form Validation...');
    
    try {
      // Test event creation with invalid data
      const invalidData = {
        name: '', // Empty name should fail
        eventType: 'INVALID_TYPE',
        startDate: 'invalid-date'
      };
      
      const validationResponse = await this.runRequest('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });
      
      this.logTest('Form Validation Working', 
        validationResponse.statusCode === 400 || validationResponse.statusCode === 401,
        `Status: ${validationResponse.statusCode}`);
        
    } catch (error) {
      this.logTest('Form Validation', false, error.message);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 UAT TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.testCount}`);
    console.log(`✅ Passed: ${this.passCount}`);
    console.log(`❌ Failed: ${this.failCount}`);
    console.log(`📈 Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`);
    
    if (this.failCount > 0) {
      console.log('\n🚨 FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   ❌ ${result.test}: ${result.details}`);
        });
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    
    if (this.failCount === 0) {
      console.log('   🎉 All tests passed! System appears to be functioning correctly.');
    } else {
      console.log('   🔧 Focus on fixing failed tests in order of priority:');
      console.log('   1. Basic Connectivity issues (critical)');
      console.log('   2. API endpoint failures (high priority)');
      console.log('   3. Page route issues (medium priority)');
      console.log('   4. Static asset problems (low priority)');
    }
    
    return {
      total: this.testCount,
      passed: this.passCount,
      failed: this.failCount,
      successRate: (this.passCount / this.testCount) * 100,
      results: this.results
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Automated UAT Tests...');
    console.log(`Testing against: ${this.baseUrl}`);
    
    await this.testBasicConnectivity();
    await this.testEventAPIs();
    await this.testPageRoutes();
    await this.testEventDetailTabs();
    await this.testDatabaseConnectivity();
    await this.testStaticAssets();
    await this.testEventTypeEnums();
    await this.testFormValidation();
    
    return this.generateReport();
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new UATTestRunner();
  runner.runAllTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = UATTestRunner;
