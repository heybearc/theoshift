#!/usr/bin/env node

// WMACS: Debug Login Flow - Check what's happening during login
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function wmacsDebugLoginFlow() {
  console.log('🔍 WMACS: Debugging Login Flow');
  
  try {
    // Step 1: Check current application logs
    console.log('📋 Step 1: Checking current application logs');
    const logs = await execAsync('ssh root@10.92.3.24 "tail -50 /var/log/jw-attendant-scheduler.log"');
    console.log('Recent logs:');
    console.log(logs.stdout);

    // Step 2: Check if multiple processes are running
    console.log('\n🔄 Step 2: Checking for multiple processes');
    const processes = await execAsync('ssh root@10.92.3.24 "ps aux | grep -E \\"(node|npm)\\" | grep -v grep"');
    console.log('Running processes:');
    console.log(processes.stdout);

    // Step 3: Test login API directly with verbose output
    console.log('\n🔐 Step 3: Testing login API with verbose output');
    const loginTest = await execAsync('curl -v -X POST http://10.92.3.24:3001/api/auth/login -H "Content-Type: application/json" -d \'{"email": "admin@jwscheduler.local", "password": "AdminPass123!"}\' 2>&1');
    console.log('Login API response:');
    console.log(loginTest.stdout);

    // Step 4: Check if cookie is being set properly
    console.log('\n🍪 Step 4: Checking cookie handling');
    const cookieTest = await execAsync('curl -c /tmp/cookies.txt -X POST http://10.92.3.24:3001/api/auth/login -H "Content-Type: application/json" -d \'{"email": "admin@jwscheduler.local", "password": "AdminPass123!"}\' && cat /tmp/cookies.txt');
    console.log('Cookie test:');
    console.log(cookieTest.stdout);

    // Step 5: Test /api/auth/me with cookie
    console.log('\n👤 Step 5: Testing auth/me with cookie');
    const authMeTest = await execAsync('curl -b /tmp/cookies.txt http://10.92.3.24:3001/api/auth/me');
    console.log('Auth me response:');
    console.log(authMeTest.stdout);

    // Step 6: Check middleware behavior
    console.log('\n🛡️ Step 6: Testing dashboard redirect');
    const dashboardTest = await execAsync('curl -b /tmp/cookies.txt -I http://10.92.3.24:3001/dashboard 2>&1');
    console.log('Dashboard redirect test:');
    console.log(dashboardTest.stdout);

    console.log('\n✅ WMACS login flow debug completed');

  } catch (error) {
    console.error('❌ WMACS Debug Error:', error.message);
  }
}

wmacsDebugLoginFlow().catch(console.error);
