#!/usr/bin/env node

// WMACS: Final Diagnosis - Check if Next.js is running properly
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function wmacsFinalDiagnosis() {
  console.log('🔍 WMACS: Final Diagnosis');
  
  try {
    // Check if Next.js is actually running
    console.log('🔧 Step 1: Check if Next.js is running properly');
    const processCheck = await execAsync('ssh root@10.92.3.24 "ps aux | grep next"');
    console.log('Next.js processes:');
    console.log(processCheck.stdout);

    // Check what's actually serving port 3001
    console.log('\n🌐 Step 2: Check what is serving port 3001');
    const portCheck = await execAsync('ssh root@10.92.3.24 "ss -tlnp | grep :3001"');
    console.log('Port 3001 process:');
    console.log(portCheck.stdout);

    // Test if we can reach Next.js API routes
    console.log('\n📡 Step 3: Test Next.js API routes');
    const apiTest = await execAsync('curl -s http://10.92.3.24:3001/_next/static/chunks/webpack-*.js | head -c 100 || echo "No Next.js static files"');
    console.log('Next.js static files test:');
    console.log(apiTest.stdout);

    // Check if middleware.ts is being compiled
    console.log('\n🔨 Step 4: Check if middleware is compiled');
    const middlewareCheck = await execAsync('ssh root@10.92.3.24 "find /opt/jw-attendant-scheduler/current -name \'*middleware*\' -type f"');
    console.log('Middleware files:');
    console.log(middlewareCheck.stdout);

    console.log('\n✅ WMACS final diagnosis completed');

  } catch (error) {
    console.error('❌ WMACS Diagnosis Error:', error.message);
  }
}

wmacsFinalDiagnosis().catch(console.error);
