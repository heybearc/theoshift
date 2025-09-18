#!/usr/bin/env node

// WMACS Frontend Login Debug
// Check browser console, network requests, and frontend state

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function debugFrontendLogin() {
  console.log('🔍 WMACS: Debugging Frontend Login Issue');
  console.log('');

  try {
    // Step 1: Check if the application is actually serving the new code
    console.log('📋 Step 1: Checking deployment version and build info');
    const { stdout: buildInfo } = await execAsync('ssh root@10.92.3.24 "cat /opt/jw-attendant-scheduler/current/.build-info 2>/dev/null || echo \'No build info found\'"');
    console.log('Build Info:', buildInfo.trim());

    // Step 2: Check if the frontend files were actually deployed
    console.log('\n🔍 Step 2: Checking if providers.tsx has the credentials fix');
    const { stdout: providersCheck } = await execAsync('ssh root@10.92.3.24 "grep -n \'credentials.*include\' /opt/jw-attendant-scheduler/current/app/providers.tsx || echo \'Credentials fix not found\'"');
    console.log('Providers.tsx credentials fix:', providersCheck.trim());

    // Step 3: Check the actual login page being served
    console.log('\n🌐 Step 3: Testing frontend login page response');
    const { stdout: loginPageTest } = await execAsync('curl -s http://10.92.3.24:3001/auth/signin | head -20');
    console.log('Login page HTML (first 20 lines):');
    console.log(loginPageTest);

    // Step 4: Check if there are any JavaScript errors in the build
    console.log('\n🔧 Step 4: Checking for JavaScript build errors');
    const { stdout: jsErrors } = await execAsync('ssh root@10.92.3.24 "find /opt/jw-attendant-scheduler/current/.next -name \'*.js\' -exec grep -l \'Error\\|error\\|undefined\' {} \\; 2>/dev/null | head -5 || echo \'No obvious JS errors found\'"');
    console.log('JavaScript errors:', jsErrors.trim());

    // Step 5: Test the login API directly from the server
    console.log('\n🧪 Step 5: Testing login API from staging server');
    const { stdout: apiTest } = await execAsync('ssh root@10.92.3.24 "curl -X POST http://localhost:3001/api/auth/login -H \'Content-Type: application/json\' -d \'{\\\"email\\\":\\\"admin@jwscheduler.local\\\",\\\"password\\\":\\\"AdminPass123!\\\"}\' -s"');
    console.log('API Test Result:', apiTest.trim());

    console.log('\n✅ WMACS frontend debug completed');
    console.log('🎯 Next: Check browser developer tools for network/console errors');

  } catch (error) {
    console.error('❌ WMACS Frontend Debug Error:', error.message);
  }
}

debugFrontendLogin().catch(console.error);
