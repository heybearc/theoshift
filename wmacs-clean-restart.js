#!/usr/bin/env node

// WMACS: Clean Application Restart
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function wmacsCleanRestart() {
  console.log('🔧 WMACS: Clean Application Restart');
  
  try {
    // Step 1: Kill all node processes
    console.log('🛑 Step 1: Stopping all node processes');
    await execAsync('ssh root@10.92.3.24 "pkill -f node || true"');
    console.log('✅ Node processes stopped');

    // Step 2: Wait and verify port is free
    console.log('⏳ Step 2: Waiting for port to be free');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const portCheck = await execAsync('ssh root@10.92.3.24 "ss -tlnp | grep :3001 || echo \\"Port 3001 is free\\""');
    console.log('Port status:', portCheck.stdout.trim());

    // Step 3: Start application with proper environment
    console.log('🚀 Step 3: Starting application');
    const startCmd = `ssh root@10.92.3.24 "cd /opt/jw-attendant-scheduler/current && \\
DATABASE_URL='postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging' \\
JWT_SECRET=\\$(openssl rand -hex 32) \\
NODE_ENV=production \\
nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 & \\
echo 'Application started'"`;
    
    await execAsync(startCmd);
    console.log('✅ Application start command executed');

    // Step 4: Wait and verify startup
    console.log('⏳ Step 4: Waiting for application startup');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const healthCheck = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://10.92.3.24:3001/auth/signin');
    console.log('Health check status:', healthCheck.stdout.trim());

    // Step 5: Check logs for any errors
    console.log('📋 Step 5: Checking startup logs');
    const logs = await execAsync('ssh root@10.92.3.24 "tail -20 /var/log/jw-attendant-scheduler.log"');
    console.log('Recent logs:');
    console.log(logs.stdout);

    console.log('\n✅ WMACS clean restart completed');

  } catch (error) {
    console.error('❌ WMACS Restart Error:', error.message);
  }
}

wmacsCleanRestart().catch(console.error);
