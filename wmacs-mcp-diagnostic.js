#!/usr/bin/env node

/**
 * WMACS MCP Diagnostic Tool
 * Comprehensive health check for all application endpoints
 */

const { spawn } = require('child_process');
const fs = require('fs');

class WMACsMCPDiagnostic {
  constructor() {
    this.config = JSON.parse(fs.readFileSync('./wmacs/config/project.json', 'utf8'));
    this.environments = JSON.parse(fs.readFileSync('./wmacs/config/environments.json', 'utf8'));
  }

  async runFullDiagnostic() {
    console.log('🛡️ WMACS MCP: Running comprehensive diagnostic');
    console.log('=============================================');
    
    const stagingEnv = this.environments.staging;
    const baseUrl = `http://localhost:${stagingEnv.port}`;
    
    const endpoints = [
      { name: 'Main Page', url: '/' },
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Admin Panel', url: '/admin' },
      { name: 'Admin Users', url: '/admin/users' },
      { name: 'Signin Page', url: '/auth/signin' },
      { name: 'Users API', url: '/api/admin/users' },
      { name: 'Events API', url: '/api/events' },
      { name: 'Attendants API', url: '/api/attendants' }
    ];

    console.log(`🎯 Testing ${endpoints.length} endpoints on ${stagingEnv.ip}:${stagingEnv.port}`);
    console.log('');

    const results = [];
    
    for (const endpoint of endpoints) {
      console.log(`🔍 Testing: ${endpoint.name} (${endpoint.url})`);
      
      try {
        const result = await this.testEndpoint(stagingEnv, baseUrl + endpoint.url);
        results.push({
          ...endpoint,
          status: result.status,
          success: result.status === '200',
          error: result.error
        });
        
        if (result.status === '200') {
          console.log(`✅ ${endpoint.name}: ${result.status} OK`);
        } else {
          console.log(`❌ ${endpoint.name}: ${result.status} ${result.error || 'ERROR'}`);
        }
      } catch (error) {
        results.push({
          ...endpoint,
          status: 'ERROR',
          success: false,
          error: error.message
        });
        console.log(`💥 ${endpoint.name}: FAILED - ${error.message}`);
      }
    }

    console.log('');
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('====================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    
    if (failed.length > 0) {
      console.log('');
      console.log('🚨 FAILED ENDPOINTS:');
      failed.forEach(f => {
        console.log(`   ❌ ${f.name}: ${f.status} - ${f.error || 'Unknown error'}`);
      });
      
      // Check server logs for 500 errors
      console.log('');
      console.log('🔍 Checking server logs for errors...');
      await this.checkServerLogs(stagingEnv);
    }
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      results: results
    };
  }

  async testEndpoint(envConfig, url) {
    try {
      const command = `ssh ${envConfig.ssh} "curl -s -o /dev/null -w '%{http_code}' '${url}'"`;
      const result = await this.executeOperation(command);
      
      return {
        status: result.stdout.trim(),
        error: null
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  async checkServerLogs(envConfig) {
    try {
      console.log('📋 Recent server logs:');
      const logCommand = `ssh ${envConfig.ssh} "tail -20 /var/log/theoshift.log"`;
      const result = await this.executeOperation(logCommand);
      
      if (result.stdout) {
        console.log(result.stdout);
      } else {
        console.log('No recent logs found');
      }
    } catch (error) {
      console.log(`❌ Could not read logs: ${error.message}`);
    }
  }

  async executeOperation(command) {
    return new Promise((resolve, reject) => {
      const process = spawn('bash', ['-c', command], { 
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000 
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        const isSSHWarning = stderr.includes('Warning: Permanently added') && stderr.trim().split('\\n').length === 1;
        
        if (code === 0 || code === null || (code === 255 && isSSHWarning)) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }
}

// CLI execution
async function main() {
  const diagnostic = new WMACsMCPDiagnostic();
  
  try {
    const results = await diagnostic.runFullDiagnostic();
    
    if (results.failed > 0) {
      console.log('\\n🚨 DIAGNOSTIC FAILED - Issues detected');
      process.exit(1);
    } else {
      console.log('\\n🎉 DIAGNOSTIC PASSED - All endpoints healthy');
      process.exit(0);
    }
  } catch (error) {
    console.error('\\n💥 DIAGNOSTIC ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { WMACsMCPDiagnostic };
