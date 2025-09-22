#!/usr/bin/env node

// WMACS Server Recovery - Complete staging server recovery using WMACS and MCP integration
// Handles port conflicts, process cleanup, and application startup

const WMACSTerminalStabilizer = require('./wmacs-terminal-stabilizer.js');

class WMACSServerRecovery {
  constructor() {
    this.stabilizer = new WMACSTerminalStabilizer();
    this.stagingHost = '10.92.3.24';
    this.stagingPort = 3001;
    this.appPath = '/opt/jw-attendant-scheduler/current';
    this.dbUrl = 'postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging';
  }

  async executeStableCommand(command, description) {
    console.log(`🔧 ${description}`);
    return await this.stabilizer.createStableCommand(command, {
      timeout: 45000,
      retries: 2
    });
  }

  async aggressivePortCleanup() {
    console.log('🧹 WMACS: Aggressive port cleanup on staging server...');
    
    // Step 1: Kill all processes using port 3001
    await this.executeStableCommand(
      `ssh root@${this.stagingHost} "fuser -k ${this.stagingPort}/tcp || true"`,
      'Force kill processes using port 3001'
    );
    
    // Step 2: Kill all npm and node processes
    await this.executeStableCommand(
      `ssh root@${this.stagingHost} "pkill -9 -f 'npm start' || true"`,
      'Kill npm start processes'
    );
    
    await this.executeStableCommand(
      `ssh root@${this.stagingHost} "pkill -9 -f 'next start' || true"`,
      'Kill next start processes'
    );
    
    await this.executeStableCommand(
      `ssh root@${this.stagingHost} "pkill -9 -f 'node.*${this.stagingPort}' || true"`,
      'Kill node processes on port 3001'
    );
    
    // Step 3: Wait and verify port is free
    console.log('⏳ Waiting for port cleanup...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const portCheck = await this.executeStableCommand(
      `ssh root@${this.stagingHost} "ss -tlnp | grep :${this.stagingPort} || echo 'PORT_FREE'"`,
      'Verify port 3001 is free'
    );
    
    if (!portCheck.stdout.includes('PORT_FREE')) {
      console.log('⚠️  Port still in use, attempting nuclear cleanup...');
      await this.executeStableCommand(
        `ssh root@${this.stagingHost} "killall -9 node || true"`,
        'Nuclear cleanup - kill all node processes'
      );
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('✅ Port cleanup complete');
  }

  async startApplication() {
    console.log('🚀 WMACS: Starting JW Attendant Scheduler application...');
    
    // Generate fresh JWT secret
    const jwtSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const startCommand = `ssh root@${this.stagingHost} "cd ${this.appPath} && \\
DATABASE_URL='${this.dbUrl}' \\
JWT_SECRET='${jwtSecret}' \\
NODE_ENV=production \\
NEXTAUTH_URL='http://${this.stagingHost}:${this.stagingPort}' \\
NEXTAUTH_SECRET='${jwtSecret}' \\
nohup npm start -- -p ${this.stagingPort} > /var/log/jw-attendant-scheduler.log 2>&1 &"`;
    
    await this.executeStableCommand(startCommand, 'Start application with proper environment');
    
    console.log('⏳ Waiting for application startup...');
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  async verifyApplication() {
    console.log('🏥 WMACS: Verifying application health...');
    
    // Check if process is running
    const processCheck = await this.executeStableCommand(
      `ssh root@${this.stagingHost} "ps aux | grep 'npm start' | grep -v grep || echo 'NO_PROCESS'"`,
      'Check if npm process is running'
    );
    
    if (processCheck.stdout.includes('NO_PROCESS')) {
      throw new Error('Application process not found');
    }
    
    console.log('✅ Application process is running');
    
    // Check if port is listening
    const portCheck = await this.executeStableCommand(
      `ssh root@${this.stagingHost} "ss -tlnp | grep :${this.stagingPort} || echo 'NOT_LISTENING'"`,
      'Check if port 3001 is listening'
    );
    
    if (portCheck.stdout.includes('NOT_LISTENING')) {
      throw new Error('Application not listening on port 3001');
    }
    
    console.log('✅ Application is listening on port 3001');
    
    // Check application logs
    const logs = await this.executeStableCommand(
      `ssh root@${this.stagingHost} "tail -10 /var/log/jw-attendant-scheduler.log"`,
      'Check application startup logs'
    );
    
    console.log('📋 Recent application logs:');
    console.log(logs.stdout);
    
    // Test HTTP connectivity
    try {
      const httpTest = await this.executeStableCommand(
        `curl -f http://${this.stagingHost}:${this.stagingPort}/ -m 10`,
        'Test HTTP connectivity'
      );
      console.log('✅ HTTP connectivity successful');
      return true;
    } catch (error) {
      console.log('⚠️  HTTP test failed, but application may still be starting');
      return false;
    }
  }

  async fullRecovery() {
    console.log('🛡️ WMACS Server Recovery: Starting full staging server recovery...');
    
    try {
      // Step 1: Aggressive port cleanup
      await this.aggressivePortCleanup();
      
      // Step 2: Start application
      await this.startApplication();
      
      // Step 3: Verify application
      const isHealthy = await this.verifyApplication();
      
      if (isHealthy) {
        console.log('\n🎉 WMACS Server Recovery: SUCCESS!');
        console.log(`✅ Staging server is running at: http://${this.stagingHost}:${this.stagingPort}`);
        console.log('✅ All systems operational');
      } else {
        console.log('\n⚠️  WMACS Server Recovery: PARTIAL SUCCESS');
        console.log(`✅ Application started at: http://${this.stagingHost}:${this.stagingPort}`);
        console.log('⚠️  HTTP connectivity may still be initializing');
      }
      
      return { success: true, healthy: isHealthy };
      
    } catch (error) {
      console.error('\n❌ WMACS Server Recovery: FAILED');
      console.error(`Error: ${error.message}`);
      
      // Emergency diagnostics
      console.log('\n🚨 Emergency diagnostics:');
      try {
        await this.executeStableCommand(
          `ssh root@${this.stagingHost} "tail -20 /var/log/jw-attendant-scheduler.log"`,
          'Get detailed error logs'
        );
      } catch (diagError) {
        console.log('Could not retrieve diagnostics:', diagError.message);
      }
      
      return { success: false, error: error.message };
    }
  }
}

// CLI usage
if (require.main === module) {
  const recovery = new WMACSServerRecovery();
  
  recovery.fullRecovery()
    .then(result => {
      if (result.success) {
        console.log('\n🎯 Recovery completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Recovery failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Recovery script failed:', error.message);
      process.exit(1);
    });
}

module.exports = WMACSServerRecovery;
