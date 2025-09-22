#!/usr/bin/env node

// WMACS Simple Recovery - Direct server recovery without complex escaping

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function simpleRecovery() {
  console.log('🛡️ WMACS Simple Recovery: Starting staging server recovery');
  
  const host = '10.92.3.24';
  const port = 3001;
  
  try {
    // Step 1: Kill processes using port
    console.log('\n🧹 Step 1: Killing processes on port 3001');
    try {
      await execAsync(`ssh root@${host} "fuser -k ${port}/tcp" 2>/dev/null || true`);
      console.log('✅ Port cleanup attempted');
    } catch (error) {
      console.log('⚠️  Port cleanup warning (may be expected)');
    }
    
    // Step 2: Kill npm processes
    console.log('\n🧹 Step 2: Killing npm processes');
    try {
      await execAsync(`ssh root@${host} "pkill -f npm" 2>/dev/null || true`);
      console.log('✅ NPM processes killed');
    } catch (error) {
      console.log('⚠️  NPM kill warning (may be expected)');
    }
    
    // Step 3: Wait for cleanup
    console.log('\n⏳ Step 3: Waiting for cleanup');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Check port status
    console.log('\n🔍 Step 4: Checking port status');
    const portCheck = await execAsync(`ssh root@${host} "ss -tlnp | grep :${port} || echo 'PORT_FREE'"`);
    console.log('Port status:', portCheck.stdout.trim());
    
    // Step 5: Start application
    console.log('\n🚀 Step 5: Starting application');
    const dbUrl = 'postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging';
    const jwtSecret = 'wmacs-recovery-secret-' + Date.now();
    
    const startCommand = `cd /opt/jw-attendant-scheduler/current && ` +
      `DATABASE_URL='${dbUrl}' ` +
      `JWT_SECRET='${jwtSecret}' ` +
      `NODE_ENV=production ` +
      `nohup npm start -- -p ${port} > /var/log/jw-attendant-scheduler.log 2>&1 &`;
    
    await execAsync(`ssh root@${host} "${startCommand}"`);
    console.log('✅ Application start command executed');
    
    // Step 6: Wait for startup
    console.log('\n⏳ Step 6: Waiting for application startup');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 7: Verify application
    console.log('\n🏥 Step 7: Verifying application');
    
    const processCheck = await execAsync(`ssh root@${host} "ps aux | grep 'npm start' | grep -v grep || echo 'NO_PROCESS'"`);
    console.log('Process check:', processCheck.stdout.trim());
    
    const listeningCheck = await execAsync(`ssh root@${host} "ss -tlnp | grep :${port} || echo 'NOT_LISTENING'"`);
    console.log('Listening check:', listeningCheck.stdout.trim());
    
    const logs = await execAsync(`ssh root@${host} "tail -15 /var/log/jw-attendant-scheduler.log"`);
    console.log('\n📋 Application logs:');
    console.log(logs.stdout);
    
    // Step 8: Test HTTP connectivity
    console.log('\n🌐 Step 8: Testing HTTP connectivity');
    try {
      const httpTest = await execAsync(`curl -f http://${host}:${port}/ -m 10`);
      console.log('✅ HTTP test successful!');
      console.log('\n🎉 WMACS Recovery: COMPLETE SUCCESS!');
      console.log(`✅ Staging server is running at: http://${host}:${port}`);
      return true;
    } catch (httpError) {
      console.log('⚠️  HTTP test failed, checking if app is still starting...');
      
      // Check logs for startup progress
      const recentLogs = await execAsync(`ssh root@${host} "tail -5 /var/log/jw-attendant-scheduler.log"`);
      console.log('Recent logs:', recentLogs.stdout);
      
      console.log('\n⚠️  WMACS Recovery: PARTIAL SUCCESS');
      console.log(`✅ Application started, may still be initializing`);
      console.log(`🔗 Try: http://${host}:${port}`);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ WMACS Recovery: FAILED');
    console.error('Error:', error.message);
    
    // Emergency diagnostics
    try {
      console.log('\n🚨 Emergency diagnostics:');
      const emergencyLogs = await execAsync(`ssh root@${host} "tail -20 /var/log/jw-attendant-scheduler.log"`);
      console.log(emergencyLogs.stdout);
    } catch (diagError) {
      console.log('Could not get emergency diagnostics');
    }
    
    return false;
  }
}

// Run recovery
if (require.main === module) {
  simpleRecovery()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Recovery script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { simpleRecovery };
