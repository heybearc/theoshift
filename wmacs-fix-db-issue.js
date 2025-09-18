#!/usr/bin/env node

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function wmacsTroubleshootDatabase() {
  console.log('🔧 WMACS: Troubleshooting Database Credential Issue');
  console.log('');

  const client = new Client(
    {
      name: "wmacs-db-troubleshoot",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: ["/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-server-ops/src/index.js"],
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to WMACS MCP Server');

    // Step 1: Check current process status
    console.log('\n🔍 Step 1: Checking application process status');
    const processCheck = await client.callTool({
      name: "ssh_command",
      arguments: {
        host: "10.92.3.24",
        command: "ps aux | grep 'npm start' | grep -v grep",
        reason: "Check if JW Attendant Scheduler application is currently running"
      }
    });
    console.log('Process Status:', processCheck.content[0].text);

    // Step 2: Check current environment variables in deployment
    console.log('\n🔍 Step 2: Checking deployment environment');
    const envCheck = await client.callTool({
      name: "ssh_command", 
      arguments: {
        host: "10.92.3.24",
        command: "cd /opt/jw-attendant-scheduler/current && ls -la .env* || echo 'No .env files found'",
        reason: "Check for environment configuration files in current deployment"
      }
    });
    console.log('Environment Files:', envCheck.content[0].text);

    // Step 3: Stop any existing process
    console.log('\n🛑 Step 3: Stopping existing application processes');
    const stopProcess = await client.callTool({
      name: "ssh_command",
      arguments: {
        host: "10.92.3.24", 
        command: "pkill -f 'npm start' || echo 'No npm start processes found'",
        reason: "Stop any existing JW Attendant Scheduler processes before restart"
      }
    });
    console.log('Stop Result:', stopProcess.content[0].text);

    // Step 4: Start application with correct DATABASE_URL
    console.log('\n🚀 Step 4: Starting application with correct database credentials');
    const startApp = await client.callTool({
      name: "ssh_command",
      arguments: {
        host: "10.92.3.24",
        command: "cd /opt/jw-attendant-scheduler/current && DATABASE_URL='postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging' JWT_SECRET=$(openssl rand -hex 32) NODE_ENV=production nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 & echo 'Application started'",
        reason: "Start JW Attendant Scheduler with correct staging database credentials"
      }
    });
    console.log('Start Result:', startApp.content[0].text);

    // Step 5: Verify process is running
    console.log('\n✅ Step 5: Verifying application is running');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    const verifyProcess = await client.callTool({
      name: "ssh_command",
      arguments: {
        host: "10.92.3.24",
        command: "ps aux | grep 'npm start' | grep -v grep",
        reason: "Verify JW Attendant Scheduler application started successfully"
      }
    });
    console.log('Process Verification:', verifyProcess.content[0].text);

    // Step 6: Test API endpoint
    console.log('\n🔌 Step 6: Testing API endpoint');
    const apiTest = await client.callTool({
      name: "ssh_command",
      arguments: {
        host: "10.92.3.24",
        command: "curl -s http://localhost:3001/api/auth/me || echo 'API test failed'",
        reason: "Test JW Attendant Scheduler API endpoint to verify it's responding"
      }
    });
    console.log('API Test Result:', apiTest.content[0].text);

    console.log('\n✅ WMACS troubleshooting completed');
    console.log('🎯 Next: Test authentication flow with admin credentials');

  } catch (error) {
    console.error('❌ WMACS Error:', error.message);
  } finally {
    await client.close();
  }
}

wmacsTroubleshootDatabase().catch(console.error);
