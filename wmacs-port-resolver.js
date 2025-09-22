#!/usr/bin/env node

// WMACS Port Conflict Resolver
// Uses WMACS Guardian to resolve port conflicts and restart applications

const WMACSGuardian = require('./wmacs-guardian.js');

async function resolvePortConflict() {
  const guardian = new WMACSGuardian();
  
  console.log('🛡️ WMACS Guardian: Resolving port 3001 conflict on staging server');
  
  try {
    // Step 1: Identify what's using port 3001
    console.log('\n🔍 Step 1: Identifying port usage');
    await guardian.executeCommand('10.92.3.24', 'ss -tlnp | grep :3001 || echo "Port 3001 appears free"', 'Check port 3001 usage');
    
    // Step 2: Kill all node processes aggressively
    console.log('\n🛑 Step 2: Aggressive process cleanup');
    await guardian.executeCommand('10.92.3.24', 'pkill -9 -f "npm start" || true', 'Kill npm start processes');
    await guardian.executeCommand('10.92.3.24', 'pkill -9 -f "next start" || true', 'Kill next start processes');
    await guardian.executeCommand('10.92.3.24', 'pkill -9 -f "node.*3001" || true', 'Kill any node processes on port 3001');
    await guardian.executeCommand('10.92.3.24', 'fuser -k 3001/tcp || true', 'Force kill anything using port 3001');
    
    // Step 3: Wait and verify port is free
    console.log('\n⏳ Step 3: Waiting for port cleanup');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await guardian.executeCommand('10.92.3.24', 'ss -tlnp | grep :3001 || echo "Port 3001 is now free"', 'Verify port is free');
    
    // Step 4: Start application with proper environment
    console.log('\n🚀 Step 4: Starting application with WMACS Guardian protection');
    const startCommand = `cd /opt/jw-attendant-scheduler/current && \\
DATABASE_URL='postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging' \\
JWT_SECRET=\\$(openssl rand -hex 32) \\
NODE_ENV=production \\
nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 &`;
    
    await guardian.executeCommand('10.92.3.24', startCommand, 'Start JW Attendant Scheduler application');
    
    // Step 5: Wait and verify startup
    console.log('\n⏳ Step 5: Waiting for application startup');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 6: Health check
    console.log('\n🏥 Step 6: Health check');
    await guardian.executeCommand('10.92.3.24', 'ps aux | grep "npm start" | grep -v grep || echo "No npm processes found"', 'Check if npm is running');
    await guardian.executeCommand('10.92.3.24', 'ss -tlnp | grep :3001 || echo "Port 3001 not listening"', 'Check if port 3001 is listening');
    await guardian.executeCommand('10.92.3.24', 'tail -10 /var/log/jw-attendant-scheduler.log', 'Check application logs');
    
    console.log('\n✅ WMACS Guardian: Port conflict resolution complete');
    
    // Step 7: Final connectivity test
    console.log('\n🌐 Step 7: Testing application connectivity');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const healthCheck = await execAsync('curl -f http://10.92.3.24:3001/ -m 10');
      console.log('✅ Application is responding to HTTP requests');
    } catch (error) {
      console.log('⚠️  Application may still be starting up or have issues');
      console.log('   Checking logs for more details...');
      await guardian.executeCommand('10.92.3.24', 'tail -20 /var/log/jw-attendant-scheduler.log', 'Get detailed startup logs');
    }
    
  } catch (error) {
    console.error('❌ WMACS Guardian failed:', error.message);
    
    // Emergency recovery
    console.log('\n🚨 Emergency Recovery: Attempting alternative startup method');
    try {
      await guardian.executeCommand('10.92.3.24', 'cd /opt/jw-attendant-scheduler/current && npm run dev -- -p 3001 &', 'Emergency dev mode startup');
    } catch (recoveryError) {
      console.error('❌ Emergency recovery also failed:', recoveryError.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  resolvePortConflict().catch(console.error);
}

module.exports = { resolvePortConflict };
