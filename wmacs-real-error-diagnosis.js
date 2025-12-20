#!/usr/bin/env node

// WMACS Guardian: REAL Error Diagnosis Protocol
// Stop assuming - get actual error details from browser and network

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSRealErrorDiagnosis {
  constructor() {
    this.baseUrl = 'http://10.92.3.24:3001';
    this.stagingServer = 'jws';
  }

  async runRealDiagnosis() {
    console.log('🔍 WMACS Guardian: REAL Error Diagnosis - Stop Assuming, Get Facts...\n');
    
    // Step 1: Test actual browser request simulation
    await this.simulateBrowserRequest();
    
    // Step 2: Test authenticated API call
    await this.testAuthenticatedAPICall();
    
    // Step 3: Check NextAuth session endpoint
    await this.checkSessionEndpoint();
    
    // Step 4: Test CORS and headers
    await this.testCORSAndHeaders();
    
    // Step 5: Check if getServerSession is working
    await this.testGetServerSession();
    
    console.log('\n📋 WMACS Guardian: Next Steps for REAL Fix');
    console.log('===========================================');
    console.log('1. User needs to open browser dev tools (F12)');
    console.log('2. Go to Network tab');
    console.log('3. Navigate to http://10.92.3.24:3001');
    console.log('4. Sign in and go to dashboard');
    console.log('5. Look for failed API requests in Network tab');
    console.log('6. Click on failed request to see exact error');
    console.log('7. Share the exact error message and status code');
    console.log('\n🎯 ONLY with real browser error details can we provide the correct fix!');
  }

  async simulateBrowserRequest() {
    console.log('🌐 Simulating Browser Request to Dashboard');
    
    try {
      // Test what a browser would actually see
      const result = await execAsync(`ssh ${this.stagingServer} "curl -s -w 'STATUS:%{http_code}\\nSIZE:%{size_download}\\n' '${this.baseUrl}/dashboard'"`);
      console.log('   Dashboard response:', result.stdout.trim());
      
      // Check if dashboard page loads at all
      const contentCheck = await execAsync(`ssh ${this.stagingServer} "curl -s '${this.baseUrl}/dashboard' | grep -o 'Theocratic Shift Scheduler\\|Failed to fetch\\|Loading dashboard' | head -3"`);
      console.log('   Dashboard content indicators:', contentCheck.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Dashboard request failed:', error.message);
    }
  }

  async testAuthenticatedAPICall() {
    console.log('\n🔌 Testing API Call with Session Simulation');
    
    try {
      // First get a session cookie by hitting the session endpoint
      const sessionResult = await execAsync(`ssh ${this.stagingServer} "curl -s -c /tmp/cookies.txt '${this.baseUrl}/api/auth/session'"`);
      console.log('   Session endpoint response:', sessionResult.stdout.trim());
      
      // Now try API call with cookies
      const apiWithCookies = await execAsync(`ssh ${this.stagingServer} "curl -s -b /tmp/cookies.txt '${this.baseUrl}/api/users'"`);
      console.log('   API call with cookies:', apiWithCookies.stdout.trim());
      
      // Clean up
      await execAsync(`ssh ${this.stagingServer} "rm -f /tmp/cookies.txt"`);
      
    } catch (error) {
      console.log('   ❌ Authenticated API test failed:', error.message);
    }
  }

  async checkSessionEndpoint() {
    console.log('\n🍪 Checking NextAuth Session Endpoint');
    
    try {
      const result = await execAsync(`ssh ${this.stagingServer} "curl -s -v '${this.baseUrl}/api/auth/session' 2>&1 | grep -E 'HTTP|Set-Cookie|Location'"`);
      console.log('   Session endpoint headers:', result.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Session endpoint check failed:', error.message);
    }
  }

  async testCORSAndHeaders() {
    console.log('\n🔒 Testing CORS and Headers');
    
    try {
      const corsResult = await execAsync(`ssh ${this.stagingServer} "curl -s -H 'Origin: ${this.baseUrl}' -v '${this.baseUrl}/api/users' 2>&1 | grep -E 'Access-Control|CORS|Origin'"`);
      console.log('   CORS headers:', corsResult.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ CORS test failed:', error.message);
    }
  }

  async testGetServerSession() {
    console.log('\n🔧 Testing getServerSession Implementation');
    
    try {
      // Check if auth.ts file exists and is accessible
      const authFileResult = await execAsync(`ssh ${this.stagingServer} "ls -la /opt/theoshift/auth.ts"`);
      console.log('   Auth file status:', authFileResult.stdout.trim());
      
      // Check if the auth import path is correct in auth-helpers
      const authImportResult = await execAsync(`ssh ${this.stagingServer} "grep -n 'authOptions' /opt/theoshift/src/lib/auth-helpers.ts"`);
      console.log('   Auth import in helpers:', authImportResult.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ getServerSession test failed:', error.message);
    }
  }
}

// Run real diagnosis
const diagnosis = new WMACSRealErrorDiagnosis();
diagnosis.runRealDiagnosis().catch(console.error);
