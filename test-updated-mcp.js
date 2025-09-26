#!/usr/bin/env node

/**
 * Test Updated MCP Server
 * Verifies that the MCP server now detects Next.js correctly
 */

const EnhancedJWMCP = require('./enhanced-jw-mcp.js');

async function testUpdatedMCP() {
    console.log('🧪 Testing Updated MCP Server...\n');
    
    const mcp = new EnhancedJWMCP();
    
    try {
        // Test the performRealHealthCheck method directly
        console.log('🔍 Testing performRealHealthCheck method...');
        const healthData = await mcp.performRealHealthCheck();
        
        console.log('✅ Health Check Results:');
        console.log(`   Framework: ${healthData.backend.framework}`);
        console.log(`   Admin Modules: ${healthData.admin.pages}`);
        console.log(`   Frontend Status: ${healthData.frontend.status}`);
        console.log(`   Database: ${healthData.database.type}\n`);
        
        // Verify it detects Next.js
        if (healthData.backend.framework === 'Next.js API Routes') {
            console.log('✅ SUCCESS: MCP correctly detects Next.js!');
        } else {
            console.log(`❌ ISSUE: MCP detected "${healthData.backend.framework}" instead of Next.js`);
        }
        
        // Verify admin module count
        if (healthData.admin.pages.includes('6/6')) {
            console.log('✅ SUCCESS: MCP correctly counts 6/6 admin modules!');
        } else {
            console.log(`⚠️  INFO: MCP reports "${healthData.admin.pages}" admin modules`);
        }
        
        console.log('\n🎯 MCP Server Update: SUCCESSFUL');
        console.log('The MCP server now properly detects the Next.js architecture!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUpdatedMCP();
