#!/usr/bin/env node

/**
 * Comprehensive test script for Next.js SDD implementation
 * Tests all API endpoints and SDD library functionality
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test utilities
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test cases
const tests = [
  {
    name: 'Homepage Load Test',
    test: async () => {
      const response = await makeRequest('/');
      return response.status === 200;
    }
  },
  {
    name: 'Attendants Page Load Test',
    test: async () => {
      const response = await makeRequest('/attendants');
      return response.status === 200;
    }
  },
  {
    name: 'Events Page Load Test', 
    test: async () => {
      const response = await makeRequest('/events');
      return response.status === 200;
    }
  },
  {
    name: 'Counts Page Load Test',
    test: async () => {
      const response = await makeRequest('/counts');
      return response.status === 200;
    }
  },
  {
    name: 'Attendants API GET Test',
    test: async () => {
      const response = await makeRequest('/api/attendants');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Events API GET Test',
    test: async () => {
      const response = await makeRequest('/api/events');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Counts API GET Test',
    test: async () => {
      const response = await makeRequest('/api/counts');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Attendants Search API Test',
    test: async () => {
      const response = await makeRequest('/api/attendants/search?q=test');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Events Search API Test',
    test: async () => {
      const response = await makeRequest('/api/events/search?q=test');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Counts Search API Test',
    test: async () => {
      const response = await makeRequest('/api/counts/search?q=test');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Events Upcoming API Test',
    test: async () => {
      const response = await makeRequest('/api/events/upcoming');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Events Past API Test',
    test: async () => {
      const response = await makeRequest('/api/events/past');
      return response.status === 200 && Array.isArray(response.data);
    }
  },
  {
    name: 'Counts Analytics API Test',
    test: async () => {
      const response = await makeRequest('/api/counts/analytics');
      return response.status === 200 && typeof response.data === 'object';
    }
  },
  {
    name: 'Counts Generate Name API Test',
    test: async () => {
      const response = await makeRequest('/api/counts/generate-name?eventId=1');
      return response.status === 200 && response.data.sessionName;
    }
  }
];

// Run tests
async function runTests() {
  console.log('🚀 Starting Next.js SDD Functionality Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Next.js SDD implementation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation.');
  }
}

// Execute tests
runTests().catch(console.error);
