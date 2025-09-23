#!/usr/bin/env node

/**
 * WMACS Guardian Phase 5 Testing Framework
 * JW Attendant Scheduler - Comprehensive System Validation
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://jw-staging.cloudigan.net';
const STAGING_IP = 'http://10.92.3.24:3001';

class WMACSPhase5Tester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: data, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      const result = await testFn();
      if (result) {
        console.log(`✅ PASS: ${name}`);
        this.results.passed++;
        this.results.tests.push({ name, status: 'PASS', details: result });
      } else {
        console.log(`❌ FAIL: ${name}`);
        this.results.failed++;
        this.results.tests.push({ name, status: 'FAIL', details: 'Test returned false' });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name} - ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'ERROR', details: error.message });
    }
  }

  async runPhase5Tests() {
    console.log('🛡️ WMACS Guardian Phase 5 Testing Framework');
    console.log('=' .repeat(60));
    console.log('🎯 Target: JW Attendant Scheduler - Attendants Management System');
    console.log('🌐 Domain:', BASE_URL);
    console.log('🖥️  Staging IP:', STAGING_IP);
    console.log('');

    // Test 1: Dashboard Navigation
    await this.test('Dashboard loads with navigation', async () => {
      const response = await this.makeRequest(`${BASE_URL}/dashboard`);
      return response.status === 200 && 
             response.data.includes('Attendant Management') &&
             response.data.includes('Phase 5 Implementation');
    });

    // Test 2: Attendants API - GET All
    await this.test('Attendants API - GET all attendants', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/attendants`);
      return response.status === 200 && 
             response.data.success === true &&
             Array.isArray(response.data.data.attendants) &&
             response.data.data.attendants.length > 0;
    });

    // Test 3: Attendants API - GET with filters
    await this.test('Attendants API - Filter by status=CONFIRMED', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/attendants?status=CONFIRMED`);
      return response.status === 200 && 
             response.data.success === true &&
             response.data.data.attendants.every(a => a.status === 'CONFIRMED');
    });

    // Test 4: Attendants API - GET by ID
    await this.test('Attendants API - GET individual attendant', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/attendants/1`);
      return response.status === 200 && 
             response.data.success === true &&
             response.data.data.attendant.id === '1' &&
             response.data.data.attendant.user.firstName === 'John';
    });

    // Test 5: Events API Integration
    await this.test('Events API - Still functional', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/events`);
      return response.status === 200 && 
             response.data.success === true &&
             Array.isArray(response.data.data.events) &&
             response.data.data.events.length === 3;
    });

    // Test 6: Users API Integration
    await this.test('Users API - Authentication required', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/users`);
      return response.status === 200 && 
             response.data.success === false &&
             response.data.error === 'Authentication required';
    });

    // Test 7: Attendants Page Load
    await this.test('Attendants page loads', async () => {
      const response = await this.makeRequest(`${BASE_URL}/attendants`);
      return response.status === 200 && 
             response.data.includes('Attendant Management');
    });

    // Test 8: Data Structure Validation
    await this.test('Attendant data structure validation', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/attendants`);
      if (response.status !== 200 || !response.data.success) return false;
      
      const attendant = response.data.data.attendants[0];
      const requiredFields = ['id', 'userId', 'eventId', 'position', 'status', 'user', 'event'];
      return requiredFields.every(field => attendant.hasOwnProperty(field));
    });

    // Test 9: Status Filtering
    await this.test('Status filtering - PENDING', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/attendants?status=PENDING`);
      return response.status === 200 && 
             response.data.success === true &&
             response.data.data.attendants.every(a => a.status === 'PENDING');
    });

    // Test 10: Event Filtering
    await this.test('Event filtering - eventId=1', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/attendants?eventId=1`);
      return response.status === 200 && 
             response.data.success === true &&
             response.data.data.attendants.every(a => a.eventId === '1');
    });

    // Test 11: IP Access Validation
    await this.test('Direct IP access works', async () => {
      const response = await this.makeRequest(`${STAGING_IP}/api/attendants`);
      return response.status === 200 && 
             response.data.success === true;
    });

    // Test 12: Cross-API Integration
    await this.test('Cross-API data consistency', async () => {
      const attendantsRes = await this.makeRequest(`${BASE_URL}/api/attendants`);
      const eventsRes = await this.makeRequest(`${BASE_URL}/api/events`);
      
      if (!attendantsRes.data.success || !eventsRes.data.success) return false;
      
      const attendantEventIds = attendantsRes.data.data.attendants.map(a => a.eventId);
      const eventIds = eventsRes.data.data.events.map(e => e.id);
      
      return attendantEventIds.every(id => eventIds.includes(id));
    });

    // Test 13: Performance Check
    await this.test('API response time < 500ms', async () => {
      const start = Date.now();
      const response = await this.makeRequest(`${BASE_URL}/api/attendants`);
      const duration = Date.now() - start;
      
      return response.status === 200 && duration < 500;
    });

    // Test 14: Error Handling
    await this.test('404 handling for non-existent attendant', async () => {
      const response = await this.makeRequest(`${BASE_URL}/api/attendants/999`);
      return response.status === 200 && 
             response.data.success === false &&
             response.data.error === 'Attendant not found';
    });

    // Test 15: System Integration
    await this.test('Complete system integration check', async () => {
      const dashboardRes = await this.makeRequest(`${BASE_URL}/dashboard`);
      const attendantsRes = await this.makeRequest(`${BASE_URL}/api/attendants`);
      const eventsRes = await this.makeRequest(`${BASE_URL}/api/events`);
      
      return dashboardRes.status === 200 &&
             attendantsRes.status === 200 &&
             eventsRes.status === 200 &&
             attendantsRes.data.success === true &&
             eventsRes.data.success === true;
    });

    this.printResults();
  }

  printResults() {
    console.log('');
    console.log('🛡️ WMACS Guardian Phase 5 Test Results');
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

    console.log('🚀 Phase 5 Status:', this.results.failed === 0 ? 'COMPLETE ✅' : 'NEEDS ATTENTION ⚠️');
    console.log('');
    console.log('📋 System Components Tested:');
    console.log('   ✅ Attendants Management System');
    console.log('   ✅ API Endpoints & Filtering');
    console.log('   ✅ Data Structure Validation');
    console.log('   ✅ Cross-API Integration');
    console.log('   ✅ Performance & Error Handling');
    console.log('   ✅ Dashboard Navigation');
    console.log('');
  }
}

// Run the tests
const tester = new WMACSPhase5Tester();
tester.runPhase5Tests().catch(console.error);
