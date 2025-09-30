#!/usr/bin/env node
/**
 * QOS Health Monitor for JW Attendant Scheduler Staging
 * Monitors staging server health and catches deployment issues
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STAGING_URL = 'http://10.92.3.24:3001';
const QOS_CONFIG = {
  api: { p95_ms: 200 },
  spa: { bundle_kb: 200 },
  worker: { mem_mb: 256, time_sec: 30 }
};

class QOSHealthMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      staging_url: STAGING_URL,
      health_checks: [],
      api_checks: [],
      performance_metrics: {},
      issues: [],
      status: 'UNKNOWN'
    };
  }

  async runHealthChecks() {
    console.log('🏥 QOS Health Monitor Starting...');
    console.log(`🌐 Monitoring: ${STAGING_URL}\n`);

    // 1. Basic connectivity check
    await this.checkConnectivity();
    
    // 2. Frontend health check
    await this.checkFrontendHealth();
    
    // 3. API health checks
    await this.checkAPIHealth();
    
    // 4. Performance monitoring
    await this.checkPerformanceMetrics();
    
    // 5. Generate health report
    this.generateHealthReport();
    
    return this.results;
  }

  async checkConnectivity() {
    console.log('1️⃣ Connectivity Check...');
    try {
      const start = Date.now();
      const response = await axios.get(STAGING_URL, { timeout: 5000 });
      const responseTime = Date.now() - start;
      
      this.results.health_checks.push({
        check: 'connectivity',
        status: response.status === 200 ? 'PASS' : 'FAIL',
        response_time_ms: responseTime,
        details: `HTTP ${response.status}`
      });
      
      console.log(`   ✅ Connectivity: ${response.status} (${responseTime}ms)`);
    } catch (error) {
      this.results.health_checks.push({
        check: 'connectivity',
        status: 'FAIL',
        error: error.message,
        details: 'Server unreachable'
      });
      
      this.results.issues.push({
        severity: 'CRITICAL',
        issue: 'Staging server unreachable',
        details: error.message
      });
      
      console.log(`   ❌ Connectivity: FAILED - ${error.message}`);
    }
  }

  async checkFrontendHealth() {
    console.log('\n2️⃣ Frontend Health Check...');
    try {
      const response = await axios.get(STAGING_URL, { timeout: 10000 });
      const html = response.data;
      
      // Check for Next.js indicators
      const isNextJS = html.includes('_next') || html.includes('__NEXT_DATA__');
      const hasTitle = html.includes('<title>') && html.includes('JW Attendant');
      const hasNavigation = html.includes('nav') || html.includes('navigation');
      
      // Check for old SDD frontend indicators
      const hasOldSDD = html.includes('sdd-') || html.includes('admin-panel') || html.includes('auth-module');
      
      this.results.health_checks.push({
        check: 'frontend',
        status: isNextJS && hasTitle && !hasOldSDD ? 'PASS' : 'FAIL',
        details: {
          is_nextjs: isNextJS,
          has_title: hasTitle,
          has_navigation: hasNavigation,
          has_old_sdd: hasOldSDD
        }
      });
      
      if (hasOldSDD) {
        this.results.issues.push({
          severity: 'HIGH',
          issue: 'Old SDD frontend detected',
          details: 'Staging server showing old SDD components instead of current Next.js frontend'
        });
        console.log('   ❌ Frontend: OLD SDD DETECTED');
      } else if (isNextJS && hasTitle) {
        console.log('   ✅ Frontend: Next.js application loaded');
      } else {
        console.log('   ⚠️ Frontend: Issues detected');
      }
      
    } catch (error) {
      this.results.health_checks.push({
        check: 'frontend',
        status: 'FAIL',
        error: error.message
      });
      console.log(`   ❌ Frontend: FAILED - ${error.message}`);
    }
  }

  async checkAPIHealth() {
    console.log('\n3️⃣ API Health Checks...');
    
    const apiEndpoints = [
      '/api/attendants',
      '/api/events',
      '/api/users'
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const start = Date.now();
        const response = await axios.get(`${STAGING_URL}${endpoint}`, { timeout: 5000 });
        const responseTime = Date.now() - start;
        
        // Check if congregation field is present in attendants/users
        let hasCongregationField = false;
        if (endpoint.includes('attendants') || endpoint.includes('users')) {
          const data = response.data;
          if (Array.isArray(data) && data.length > 0) {
            hasCongregationField = data[0].hasOwnProperty('congregation');
          }
        }
        
        this.results.api_checks.push({
          endpoint,
          status: response.status === 200 ? 'PASS' : 'FAIL',
          response_time_ms: responseTime,
          has_congregation_field: hasCongregationField,
          data_count: Array.isArray(response.data) ? response.data.length : 'N/A'
        });
        
        const congregationStatus = hasCongregationField ? '✅ Congregation field' : '❌ No congregation field';
        console.log(`   ${response.status === 200 ? '✅' : '❌'} ${endpoint}: ${response.status} (${responseTime}ms) ${endpoint.includes('attendants') || endpoint.includes('users') ? congregationStatus : ''}`);
        
      } catch (error) {
        this.results.api_checks.push({
          endpoint,
          status: 'FAIL',
          error: error.message
        });
        
        this.results.issues.push({
          severity: 'HIGH',
          issue: `API endpoint ${endpoint} failing`,
          details: error.message
        });
        
        console.log(`   ❌ ${endpoint}: FAILED - ${error.message}`);
      }
    }
  }

  async checkPerformanceMetrics() {
    console.log('\n4️⃣ Performance Metrics...');
    
    try {
      const start = Date.now();
      await axios.get(STAGING_URL);
      const pageLoadTime = Date.now() - start;
      
      this.results.performance_metrics = {
        page_load_ms: pageLoadTime,
        meets_qos_target: pageLoadTime <= QOS_CONFIG.api.p95_ms,
        qos_target_ms: QOS_CONFIG.api.p95_ms
      };
      
      if (pageLoadTime <= QOS_CONFIG.api.p95_ms) {
        console.log(`   ✅ Page Load: ${pageLoadTime}ms (within ${QOS_CONFIG.api.p95_ms}ms target)`);
      } else {
        console.log(`   ⚠️ Page Load: ${pageLoadTime}ms (exceeds ${QOS_CONFIG.api.p95_ms}ms target)`);
        this.results.issues.push({
          severity: 'MEDIUM',
          issue: 'Page load time exceeds QOS target',
          details: `${pageLoadTime}ms > ${QOS_CONFIG.api.p95_ms}ms`
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Performance: FAILED - ${error.message}`);
    }
  }

  generateHealthReport() {
    console.log('\n📊 HEALTH REPORT SUMMARY');
    console.log('=' .repeat(50));
    
    const passedChecks = this.results.health_checks.filter(c => c.status === 'PASS').length;
    const totalChecks = this.results.health_checks.length;
    const passedAPIs = this.results.api_checks.filter(c => c.status === 'PASS').length;
    const totalAPIs = this.results.api_checks.length;
    
    console.log(`Health Checks: ${passedChecks}/${totalChecks} passed`);
    console.log(`API Endpoints: ${passedAPIs}/${totalAPIs} working`);
    console.log(`Issues Found: ${this.results.issues.length}`);
    
    if (this.results.issues.length === 0) {
      this.results.status = 'HEALTHY';
      console.log('🟢 Status: HEALTHY');
    } else {
      const criticalIssues = this.results.issues.filter(i => i.severity === 'CRITICAL').length;
      if (criticalIssues > 0) {
        this.results.status = 'CRITICAL';
        console.log('🔴 Status: CRITICAL');
      } else {
        this.results.status = 'WARNING';
        console.log('🟡 Status: WARNING');
      }
    }
    
    if (this.results.issues.length > 0) {
      console.log('\n⚠️ ISSUES DETECTED:');
      this.results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.issue}`);
        console.log(`   ${issue.details}`);
      });
    }
    
    // Save report to file
    const reportPath = path.join(__dirname, 'qos-health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);
  }
}

// Run health monitoring if called directly
if (require.main === module) {
  const monitor = new QOSHealthMonitor();
  monitor.runHealthChecks().then(() => {
    process.exit(monitor.results.status === 'HEALTHY' ? 0 : 1);
  }).catch(error => {
    console.error('Health monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = QOSHealthMonitor;
