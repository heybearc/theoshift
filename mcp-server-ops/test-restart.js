#!/usr/bin/env node

import { WMACSServerOps } from './src/index.js';

// Create a simple test script to execute the restart operation
async function testRestart() {
  const serverOps = new WMACSServerOps();
  
  try {
    console.log('🔧 Testing MCP restart_application operation...');
    
    const result = await serverOps.restartApplication({
      environment: 'staging',
      reason: 'Fix authentication cache issue - manual MCP test',
      clearCache: true
    });
    
    console.log('✅ MCP Operation Result:', result);
    
  } catch (error) {
    console.error('❌ MCP Operation Failed:', error.message);
    process.exit(1);
  }
}

testRestart();
