import { WMACSServerOps } from './mcp-server-ops/src/index.js';

async function restartApplicationWithCorrectDB() {
  const wmacs = new WMACSServerOps();
  
  try {
    console.log('🔄 Starting WMACS restart with correct database credentials...');
    
    // Stop current application
    console.log('⏹️ Stopping current application...');
    await wmacs.executeCommand('10.92.3.24', 'pkill -f "npm start"', 'Stop current JW Attendant Scheduler application');
    
    // Wait a moment for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start application with correct DATABASE_URL
    console.log('🚀 Starting application with correct database credentials...');
    const startCommand = `cd /opt/jw-attendant-scheduler/current && DATABASE_URL='postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging' JWT_SECRET="$(openssl rand -hex 32)" NODE_ENV=production nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 &`;
    
    await wmacs.executeCommand('10.92.3.24', startCommand, 'Start JW Attendant Scheduler with correct database credentials');
    
    // Wait for application to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if application is running
    console.log('✅ Checking application status...');
    await wmacs.executeCommand('10.92.3.24', 'ps aux | grep "npm start" | grep -v grep', 'Check if application is running');
    
    // Check application logs
    console.log('📋 Checking application logs...');
    await wmacs.executeCommand('10.92.3.24', 'tail -20 /var/log/jw-attendant-scheduler.log', 'Check application startup logs');
    
    console.log('✅ WMACS restart completed successfully!');
    
  } catch (error) {
    console.error('❌ WMACS restart failed:', error);
    process.exit(1);
  }
}

restartApplicationWithCorrectDB();
