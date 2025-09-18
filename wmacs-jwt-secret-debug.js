#!/usr/bin/env node

// WMACS: Debug JWT Secret Mismatch
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function wmacsJwtSecretDebug() {
  console.log('🔍 WMACS: JWT Secret Debug');
  
  try {
    // Step 1: Check environment variables in running process
    console.log('🔧 Step 1: Checking JWT_SECRET in running process');
    const envCheck = await execAsync('ssh root@10.92.3.24 "ps eww | grep \\"npm start\\" | grep -v grep | head -1"');
    console.log('Process environment:');
    console.log(envCheck.stdout);

    // Step 2: Test middleware with a fresh login
    console.log('\n🍪 Step 2: Testing fresh login and middleware');
    
    // Login to get fresh token
    const loginResult = await execAsync('curl -c /tmp/fresh-cookies.txt -X POST http://10.92.3.24:3001/api/auth/login -H "Content-Type: application/json" -d \'{"email": "admin@jwscheduler.local", "password": "AdminPass123!"}\' -s');
    console.log('Fresh login result:', loginResult.stdout.trim());

    // Test dashboard access immediately
    const dashboardResult = await execAsync('curl -b /tmp/fresh-cookies.txt -I http://10.92.3.24:3001/dashboard -s');
    console.log('Dashboard access result:');
    console.log(dashboardResult.stdout);

    // Step 3: Check if middleware logs appear
    console.log('\n📋 Step 3: Checking for middleware logs');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const middlewareLogs = await execAsync('ssh root@10.92.3.24 "tail -10 /var/log/jw-attendant-scheduler.log | grep MIDDLEWARE || echo \\"No middleware logs found\\""');
    console.log('Middleware logs:');
    console.log(middlewareLogs.stdout);

    console.log('\n✅ WMACS JWT secret debug completed');

  } catch (error) {
    console.error('❌ WMACS JWT Debug Error:', error.message);
  }
}

wmacsJwtSecretDebug().catch(console.error);
