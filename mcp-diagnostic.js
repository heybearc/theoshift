#!/usr/bin/env node

/**
 * MCP Diagnostic Tool
 * Helps debug why the MCP server isn't detecting files correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MCP Server Diagnostic Tool\n');

// Show current working directory
console.log('📁 Current Working Directory:', process.cwd());
console.log('📁 Script Directory (__dirname):', __dirname);
console.log('📁 Process argv[1]:', process.argv[1]);

// Test the same path detection logic as the MCP server
const possibleRoots = [
    process.cwd(),
    path.join(process.cwd(), '..'),
    '/Users/cory/Documents/Cloudy-Work/applications/theoshift',
    __dirname
];

console.log('\n🔍 Testing Project Root Detection:');
for (const root of possibleRoots) {
    const packageJsonPath = path.join(root, 'package.json');
    const adminPath = path.join(root, 'pages', 'admin');
    
    console.log(`\n📂 Testing: ${root}`);
    console.log(`   package.json exists: ${fs.existsSync(packageJsonPath)}`);
    console.log(`   pages/admin exists: ${fs.existsSync(adminPath)}`);
    
    if (fs.existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            console.log(`   ✅ Found package.json - Project: ${pkg.name}`);
            console.log(`   ✅ Has Next.js: ${!!pkg.dependencies?.next}`);
            
            if (fs.existsSync(adminPath)) {
                const adminDirs = fs.readdirSync(adminPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .length;
                console.log(`   ✅ Admin modules: ${adminDirs}`);
            }
            break;
        } catch (error) {
            console.log(`   ❌ Error reading package.json: ${error.message}`);
        }
    }
}

// Check if MCP server file exists and is readable
const mcpServerPath = path.join(__dirname, 'enhanced-jw-mcp.js');
console.log(`\n🔍 MCP Server File Check:`);
console.log(`   Path: ${mcpServerPath}`);
console.log(`   Exists: ${fs.existsSync(mcpServerPath)}`);

if (fs.existsSync(mcpServerPath)) {
    const stats = fs.statSync(mcpServerPath);
    console.log(`   Size: ${stats.size} bytes`);
    console.log(`   Modified: ${stats.mtime}`);
}

console.log('\n🎯 Diagnostic Complete');
