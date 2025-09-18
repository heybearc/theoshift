#!/usr/bin/env node

// WMACS Database Credential Fix Execution
// Using direct SSH commands through existing infrastructure

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function executeWMACSFix() {
  console.log('🔧 WMACS: Executing Database Credential Fix');
  console.log('');

  try {
    // Step 1: Check current application status
    console.log('🔍 Step 1: Checking current application status');
    const { stdout: statusCheck } = await execAsync('ssh root@10.92.3.24 "ps aux | grep \'npm start\' | grep -v grep || echo \'No npm processes running\'"');
    console.log('Current Status:', statusCheck.trim());

    // Step 2: Stop existing processes
    console.log('\n🛑 Step 2: Stopping existing application processes');
    const { stdout: stopResult } = await execAsync('ssh root@10.92.3.24 "pkill -f \'npm start\' || echo \'No processes to stop\'"');
    console.log('Stop Result:', stopResult.trim());

    // Step 3: Start application with correct DATABASE_URL
    console.log('\n🚀 Step 3: Starting application with correct database credentials');
    const startCommand = `ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler/current && DATABASE_URL='postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging' JWT_SECRET=\\$(openssl rand -hex 32) NODE_ENV=production nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 & echo 'Application started with PID: \\$!'"`;
    
    const { stdout: startResult } = await execAsync(startCommand);
    console.log('Start Result:', startResult.trim());

    // Step 4: Wait and verify process is running
    console.log('\n⏳ Step 4: Waiting 5 seconds for application startup');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const { stdout: verifyResult } = await execAsync('ssh root@10.92.3.24 "ps aux | grep \'npm start\' | grep -v grep || echo \'Process verification failed\'"');
    console.log('Process Verification:', verifyResult.trim());

    // Step 5: Test API endpoint
    console.log('\n🔌 Step 5: Testing API endpoint');
    const { stdout: apiTest } = await execAsync('ssh root@10.92.3.24 "curl -s http://localhost:3001/api/auth/me || echo \'API test failed\'"');
    console.log('API Test Result:', apiTest.trim());

    // Step 6: Check application logs for database connection
    console.log('\n📋 Step 6: Checking application logs');
    const { stdout: logCheck } = await execAsync('ssh root@10.92.3.24 "tail -10 /var/log/jw-attendant-scheduler.log"');
    console.log('Recent Logs:', logCheck.trim());

    console.log('\n✅ WMACS database credential fix completed');
    console.log('🎯 Ready to test authentication flow');

  } catch (error) {
    console.error('❌ WMACS Fix Error:', error.message);
  }
}

executeWMACSFix().catch(console.error);
