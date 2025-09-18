#!/usr/bin/env node

// WMACS Application Restart Script
// Uses MCP server operations with proper guardrails

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';

async function restartJWAttendantWithWMACS() {
  console.log('🔄 Using WMACS to restart JW Attendant Scheduler with correct database credentials...');
  
  // Create MCP client to communicate with WMACS server
  const mcpClient = spawn('node', ['-e', `
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
    
    async function executeWMACSRestart() {
      const transport = new StdioClientTransport({
        command: 'node',
        args: ['src/index.js'],
        cwd: '/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-server-ops'
      });
      
      const client = new Client({
        name: 'wmacs-restart-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });
      
      try {
        await client.connect(transport);
        
        // Stop current application
        console.log('⏹️ Stopping current JW Attendant application...');
        const stopResult = await client.request({
          method: 'tools/call',
          params: {
            name: 'execute_ssh_command',
            arguments: {
              host: '10.92.3.24',
              command: 'pkill -f "npm start"',
              reason: 'Stop JW Attendant Scheduler for database credential update'
            }
          }
        });
        
        console.log('Stop result:', stopResult);
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Start with correct DATABASE_URL
        console.log('🚀 Starting JW Attendant with correct database credentials...');
        const startCommand = 'cd /opt/jw-attendant-scheduler/current && DATABASE_URL=\\'postgresql://jw_scheduler_staging:Cloudy_92!@10.92.3.21:5432/jw_attendant_scheduler_staging\\' JWT_SECRET="$(openssl rand -hex 32)" NODE_ENV=production nohup npm start -- -p 3001 > /var/log/jw-attendant-scheduler.log 2>&1 &';
        
        const startResult = await client.request({
          method: 'tools/call',
          params: {
            name: 'execute_ssh_command',
            arguments: {
              host: '10.92.3.24',
              command: startCommand,
              reason: 'Start JW Attendant Scheduler with correct database credentials'
            }
          }
        });
        
        console.log('Start result:', startResult);
        
        // Verify application is running
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const verifyResult = await client.request({
          method: 'tools/call',
          params: {
            name: 'execute_ssh_command',
            arguments: {
              host: '10.92.3.24',
              command: 'ps aux | grep "npm start" | grep -v grep',
              reason: 'Verify JW Attendant Scheduler is running'
            }
          }
        });
        
        console.log('Verify result:', verifyResult);
        
        console.log('✅ WMACS restart completed successfully!');
        
      } catch (error) {
        console.error('❌ WMACS restart failed:', error);
        process.exit(1);
      } finally {
        await client.close();
      }
    }
    
    executeWMACSRestart();
  `], {
    stdio: 'inherit',
    cwd: '/Users/cory/Documents/Cloudy-Work/applications/jw-attendant-scheduler/mcp-server-ops'
  });
  
  return new Promise((resolve, reject) => {
    mcpClient.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`WMACS restart failed with code ${code}`));
      }
    });
    
    mcpClient.on('error', reject);
  });
}

restartJWAttendantWithWMACS().catch(console.error);
