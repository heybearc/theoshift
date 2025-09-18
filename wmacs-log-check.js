#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function wmacsTroubleshootLogs() {
  console.log('🔍 WMACS: Checking Application Logs for Login Issue');
  console.log('');

  try {
    // Step 1: Check current application logs
    console.log('📋 Step 1: Checking main application logs');
    const { stdout: mainLogs } = await execAsync('ssh root@10.92.3.24 "tail -30 /var/log/jw-attendant-scheduler.log"');
    console.log('Main Application Logs:');
    console.log(mainLogs);

    // Step 2: Check if application is still running
    console.log('\n🔍 Step 2: Checking application process status');
    const { stdout: processStatus } = await execAsync('ssh root@10.92.3.24 "ps aux | grep npm | grep -v grep || echo \'No npm processes running\'"');
    console.log('Process Status:', processStatus.trim());

    // Step 3: Check port status
    console.log('\n🔌 Step 3: Checking port 3001 status');
    const { stdout: portStatus } = await execAsync('ssh root@10.92.3.24 "ss -tlnp | grep :3001 || echo \'Port 3001 not listening\'"');
    console.log('Port Status:', portStatus.trim());

    // Step 4: Test API endpoint directly
    console.log('\n🧪 Step 4: Testing API endpoint from server');
    const { stdout: apiTest } = await execAsync('ssh root@10.92.3.24 "curl -s http://localhost:3001/api/auth/me || echo \'API test failed\'"');
    console.log('API Test Result:', apiTest.trim());

    // Step 5: Check for any error logs in system
    console.log('\n❌ Step 5: Checking for error logs');
    const { stdout: errorLogs } = await execAsync('ssh root@10.92.3.24 "journalctl -u jw-attendant-scheduler --no-pager -n 20 2>/dev/null || echo \'No systemd service logs found\'"');
    console.log('System Error Logs:', errorLogs.trim());

    console.log('\n✅ WMACS log analysis completed');

  } catch (error) {
    console.error('❌ WMACS Log Check Error:', error.message);
  }
}

wmacsTroubleshootLogs().catch(console.error);
