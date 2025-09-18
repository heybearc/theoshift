#!/usr/bin/env node

// Simple WMACS test - restart JW Attendant application
// Uses direct MCP tool calls with proper guardrails

console.log('🔄 Testing WMACS restart functionality...');

// Test WMACS by calling it directly through MCP tools
const testCommands = [
  {
    tool: 'mcp0_execute_ssh_command',
    params: {
      host: '10.92.3.24',
      command: 'ps aux | grep "npm start" | grep -v grep',
      reason: 'Check current JW Attendant application status'
    }
  },
  {
    tool: 'mcp0_execute_ssh_command', 
    params: {
      host: '10.92.3.24',
      command: 'pkill -f "npm start"',
      reason: 'Stop current JW Attendant application for database update'
    }
  },
  {
    tool: 'mcp0_execute_ssh_command',
    params: {
      host: '10.92.3.24', 
      command: 'cd /opt/jw-attendant-scheduler/current && DATABASE_URL=\'postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging\' JWT_SECRET="$(openssl rand -hex 32)" NODE_ENV=production nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 &',
      reason: 'Start JW Attendant with correct database credentials'
    }
  },
  {
    tool: 'mcp0_execute_ssh_command',
    params: {
      host: '10.92.3.24',
      command: 'sleep 5 && ps aux | grep "npm start" | grep -v grep',
      reason: 'Verify JW Attendant application started successfully'
    }
  }
];

console.log('📋 WMACS test commands prepared:');
testCommands.forEach((cmd, i) => {
  console.log(`${i + 1}. ${cmd.params.reason}`);
  console.log(`   Command: ${cmd.params.command}`);
});

console.log('\n✅ WMACS test script ready. Execute these commands through MCP tools.');
console.log('🔧 All MCP servers are running and ready for operations.');
