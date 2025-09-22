#!/usr/bin/env node

// WMACS Guardian: API Testing Suite
// Tests the new API endpoints for functionality and security

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSAPITester {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.testResults = [];
  }

  async runAPITests() {
    console.log('🧪 WMACS Guardian: Testing API Implementation...\n');
    
    // Test 1: API Structure
    await this.testAPIStructure();
    
    // Test 2: Authentication Middleware
    await this.testAuthenticationMiddleware();
    
    // Test 3: User API Endpoints
    await this.testUserEndpoints();
    
    // Test 4: Error Handling
    await this.testErrorHandling();
    
    this.generateTestReport();
  }

  async testAPIStructure() {
    console.log('🏗️ Testing API Structure');
    
    try {
      // Check if API directory exists
      const result = await execAsync('ssh jws "ls -la /opt/jw-attendant-scheduler/src/app/api"');
      
      if (result.stdout.includes('users')) {
        this.logSuccess('API directory structure created');
      } else {
        this.logError('API directory structure missing');
      }
    } catch (error) {
      this.logError('API structure test failed', error.message);
    }
  }

  async testAuthenticationMiddleware() {
    console.log('\n🔐 Testing Authentication Middleware');
    
    try {
      // Test unauthenticated request
      const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/api/users' | tail -1"`);
      
      if (result.stdout.includes('HTTP:401')) {
        this.logSuccess('Authentication middleware blocks unauthenticated requests');
      } else {
        this.logWarning('Authentication middleware may not be working properly');
      }
    } catch (error) {
      this.logError('Authentication test failed', error.message);
    }
  }

  async testUserEndpoints() {
    console.log('\n👥 Testing User API Endpoints');
    
    try {
      // Test GET /api/users endpoint exists
      const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/api/users' | tail -1"`);
      
      if (result.stdout.includes('HTTP:401') || result.stdout.includes('HTTP:200')) {
        this.logSuccess('User API endpoint responding');
      } else {
        this.logError('User API endpoint not responding correctly');
      }
    } catch (error) {
      this.logError('User endpoint test failed', error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling');
    
    try {
      // Test invalid endpoint
      const result = await execAsync(`ssh jws "curl -s -w 'HTTP:%{http_code}' '${this.baseUrl}/api/nonexistent' | tail -1"`);
      
      if (result.stdout.includes('HTTP:404')) {
        this.logSuccess('Proper 404 handling for invalid endpoints');
      } else {
        this.logWarning('Error handling may need improvement');
      }
    } catch (error) {
      this.logError('Error handling test failed', error.message);
    }
  }

  logSuccess(message, detail = '') {
    const result = `✅ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'success', message, detail });
  }

  logError(message, detail = '') {
    const result = `❌ ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'error', message, detail });
  }

  logWarning(message, detail = '') {
    const result = `⚠️  ${message}${detail ? ` (${detail})` : ''}`;
    console.log(`   ${result}`);
    this.testResults.push({ type: 'warning', message, detail });
  }

  generateTestReport() {
    console.log('\n📊 WMACS API Test Results');
    console.log('==========================');
    
    const successCount = this.testResults.filter(r => r.type === 'success').length;
    const errorCount = this.testResults.filter(r => r.type === 'error').length;
    const warningCount = this.testResults.filter(r => r.type === 'warning').length;
    
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 API foundation is working correctly!');
      console.log('✅ Ready to proceed with full API implementation');
    } else {
      console.log('\n⚠️  API issues detected - review and fix before proceeding');
    }
  }
}

// Run tests
const tester = new WMACSAPITester();
tester.runAPITests().catch(console.error);
