#!/usr/bin/env node

// WMACS Guardian: Bad Gateway Diagnosis
// Diagnoses and fixes bad gateway issues on production

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSBadGatewayDiagnosis {
  constructor() {
    this.productionServer = '10.92.3.22';
    this.productionPort = '3001';
    this.productionUrl = `http://${this.productionServer}:${this.productionPort}`;
  }

  async runDiagnosis() {
    console.log('🔍 WMACS Guardian: Bad Gateway Diagnosis...\n');
    console.log(`🎯 Target: ${this.productionUrl}\n`);
    
    // Step 1: Check service status
    await this.checkServiceStatus();
    
    // Step 2: Check port binding
    await this.checkPortBinding();
    
    // Step 3: Test connectivity
    await this.testConnectivity();
    
    // Step 4: Check for proxy/load balancer
    await this.checkProxyConfiguration();
    
    // Step 5: Test specific endpoints
    await this.testEndpoints();
    
    // Step 6: Check system resources
    await this.checkSystemResources();
    
    this.generateDiagnosisReport();
  }

  async checkServiceStatus() {
    console.log('🔧 Step 1: Checking Service Status');
    
    try {
      const statusResult = await execAsync(`ssh root@${this.productionServer} "systemctl status jw-attendant-nextjs --no-pager"`);
      
      if (statusResult.stdout.includes('active (running)')) {
        console.log('   ✅ Service is running');
      } else {
        console.log('   ❌ Service not running properly');
        console.log('   📋 Status:', statusResult.stdout);
      }
      
      // Check recent logs for errors
      const logsResult = await execAsync(`ssh root@${this.productionServer} "journalctl -u jw-attendant-nextjs -n 10 --no-pager"`);
      if (logsResult.stdout.includes('error') || logsResult.stdout.includes('Error')) {
        console.log('   ⚠️  Errors found in logs:');
        console.log(logsResult.stdout);
      } else {
        console.log('   ✅ No errors in recent logs');
      }
      
    } catch (error) {
      console.log('   ❌ Service status check failed:', error.message);
    }
  }

  async checkPortBinding() {
    console.log('\n🌐 Step 2: Checking Port Binding');
    
    try {
      const portResult = await execAsync(`ssh root@${this.productionServer} "ss -tlnp | grep ${this.productionPort}"`);
      
      if (portResult.stdout.includes(`*:${this.productionPort}`)) {
        console.log(`   ✅ Port ${this.productionPort} is bound and listening`);
        console.log('   📋 Details:', portResult.stdout.trim());
      } else {
        console.log(`   ❌ Port ${this.productionPort} not listening`);
      }
      
      // Check for port conflicts
      const conflictResult = await execAsync(`ssh root@${this.productionServer} "ss -tlnp | grep ${this.productionPort}" || echo "No conflicts"`);
      console.log('   📋 Port usage:', conflictResult.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Port binding check failed:', error.message);
    }
  }

  async testConnectivity() {
    console.log('\n🔌 Step 3: Testing Connectivity');
    
    try {
      // Test from server itself
      const localResult = await execAsync(`ssh root@${this.productionServer} "curl -s -w 'HTTP:%{http_code}\\n' 'http://localhost:${this.productionPort}/' | tail -1"`);
      
      if (localResult.stdout.includes('HTTP:200') || localResult.stdout.includes('HTTP:307')) {
        console.log('   ✅ Local connectivity working');
      } else {
        console.log('   ❌ Local connectivity failed:', localResult.stdout.trim());
      }
      
      // Test from external
      const externalResult = await execAsync(`curl -s -w 'HTTP:%{http_code}\\n' '${this.productionUrl}/' | tail -1`);
      
      if (externalResult.stdout.includes('HTTP:200') || externalResult.stdout.includes('HTTP:307')) {
        console.log('   ✅ External connectivity working');
      } else {
        console.log('   ❌ External connectivity failed:', externalResult.stdout.trim());
      }
      
    } catch (error) {
      console.log('   ❌ Connectivity test failed:', error.message);
    }
  }

  async checkProxyConfiguration() {
    console.log('\n🔄 Step 4: Checking Proxy Configuration');
    
    try {
      // Check for nginx
      const nginxResult = await execAsync(`ssh root@${this.productionServer} "systemctl status nginx 2>/dev/null || echo 'nginx not found'"`);
      
      if (nginxResult.stdout.includes('active')) {
        console.log('   ⚠️  Nginx is running - checking configuration');
        
        const nginxConfigResult = await execAsync(`ssh root@${this.productionServer} "nginx -t 2>&1 || echo 'nginx config error'"`);
        console.log('   📋 Nginx config:', nginxConfigResult.stdout.trim());
      } else {
        console.log('   ✅ No nginx proxy detected');
      }
      
      // Check for apache
      const apacheResult = await execAsync(`ssh root@${this.productionServer} "systemctl status apache2 2>/dev/null || echo 'apache not found'"`);
      
      if (apacheResult.stdout.includes('active')) {
        console.log('   ⚠️  Apache is running - may be causing proxy issues');
      } else {
        console.log('   ✅ No apache proxy detected');
      }
      
      // Check for other services on common ports
      const portScanResult = await execAsync(`ssh root@${this.productionServer} "ss -tlnp | grep ':80\\|:443\\|:8000\\|:8080' || echo 'No common proxy ports in use'"`);
      console.log('   📋 Common proxy ports:', portScanResult.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ Proxy configuration check failed:', error.message);
    }
  }

  async testEndpoints() {
    console.log('\n🎯 Step 5: Testing Specific Endpoints');
    
    const endpoints = [
      '/',
      '/api/auth/providers',
      '/api/auth/session',
      '/api/users',
      '/api/events'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const result = await execAsync(`curl -s -w 'HTTP:%{http_code}\\n' '${this.productionUrl}${endpoint}' | tail -1`);
        
        if (result.stdout.includes('HTTP:200') || result.stdout.includes('HTTP:307') || result.stdout.includes('HTTP:401')) {
          console.log(`   ✅ ${endpoint}: ${result.stdout.trim()}`);
        } else {
          console.log(`   ❌ ${endpoint}: ${result.stdout.trim()}`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${endpoint}: Test failed - ${error.message}`);
      }
    }
  }

  async checkSystemResources() {
    console.log('\n💻 Step 6: Checking System Resources');
    
    try {
      // Check memory usage
      const memResult = await execAsync(`ssh root@${this.productionServer} "free -h"`);
      console.log('   📊 Memory usage:');
      console.log(memResult.stdout);
      
      // Check disk space
      const diskResult = await execAsync(`ssh root@${this.productionServer} "df -h /"`);
      console.log('   💾 Disk usage:');
      console.log(diskResult.stdout);
      
      // Check CPU load
      const loadResult = await execAsync(`ssh root@${this.productionServer} "uptime"`);
      console.log('   ⚡ System load:', loadResult.stdout.trim());
      
    } catch (error) {
      console.log('   ❌ System resources check failed:', error.message);
    }
  }

  generateDiagnosisReport() {
    console.log('\n🔍 WMACS Guardian: Bad Gateway Diagnosis Complete');
    console.log('================================================');
    
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log(`   🎯 Target: ${this.productionUrl}`);
    console.log('   🔧 Service: jw-attendant-nextjs');
    console.log(`   🌐 Port: ${this.productionPort}`);
    
    console.log('\n🛠️  POTENTIAL SOLUTIONS:');
    console.log('   1. Restart the service: systemctl restart jw-attendant-nextjs');
    console.log('   2. Check firewall rules: ufw status');
    console.log('   3. Verify DNS resolution');
    console.log('   4. Check for proxy misconfigurations');
    console.log('   5. Monitor logs: journalctl -u jw-attendant-nextjs -f');
    
    console.log('\n🎯 IMMEDIATE ACTIONS:');
    console.log('   - If service is down: Restart it');
    console.log('   - If port conflicts: Kill conflicting processes');
    console.log('   - If proxy issues: Check nginx/apache configs');
    console.log('   - If resource issues: Free up memory/disk space');
    
    console.log('\n📞 SUPPORT INFORMATION:');
    console.log('   - Service logs: journalctl -u jw-attendant-nextjs');
    console.log('   - Port status: ss -tlnp | grep 3001');
    console.log('   - Process status: ps aux | grep next');
    console.log('   - System status: systemctl status jw-attendant-nextjs');
  }
}

// Run diagnosis
const diagnosis = new WMACSBadGatewayDiagnosis();
diagnosis.runDiagnosis().catch(console.error);
