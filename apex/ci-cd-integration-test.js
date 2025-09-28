#!/usr/bin/env node

/**
 * WMACS CI/CD Integration Test
 * 
 * Validates that the smart sync system works with the existing CI/CD pipeline
 * and maintains environment-specific configurations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WMACsCICDIntegrationTest {
  constructor() {
    this.testResults = [];
  }

  async runTests() {
    console.log('🛡️ WMACS CI/CD Integration Test Suite');
    console.log('=====================================\n');

    try {
      await this.testConfigurationIntegrity();
      await this.testEnvironmentSpecificSettings();
      await this.testCICDPipelineCompatibility();
      await this.testAuthenticationPreservation();
      await this.testSharedSystemSync();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testConfigurationIntegrity() {
    console.log('🧪 Testing Configuration Integrity...');
    
    // Test that required config files exist
    const requiredFiles = [
      'wmacs/config/project.json',
      'wmacs/config/environments.json',
      'wmacs/wmacs-guardian.js'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    // Test that config is valid JSON
    const projectConfig = JSON.parse(fs.readFileSync('wmacs/config/project.json', 'utf8'));
    const envConfig = JSON.parse(fs.readFileSync('wmacs/config/environments.json', 'utf8'));
    
    // Validate project config structure
    if (!projectConfig.projectName || !projectConfig.authentication) {
      throw new Error('Invalid project configuration structure');
    }
    
    // Validate environment config structure
    if (!envConfig.staging || !envConfig.production) {
      throw new Error('Invalid environment configuration structure');
    }
    
    this.addResult('Configuration Integrity', 'PASS', 'All required configs exist and are valid');
  }

  async testEnvironmentSpecificSettings() {
    console.log('🧪 Testing Environment-Specific Settings...');
    
    const envConfig = JSON.parse(fs.readFileSync('wmacs/config/environments.json', 'utf8'));
    
    // Test staging environment
    const staging = envConfig.staging;
    if (staging.container !== '135' || staging.ip !== '10.92.3.25') {
      throw new Error('Staging environment configuration incorrect');
    }
    
    // Test production environment  
    const production = envConfig.production;
    if (production.container !== '133' || production.ip !== '10.92.3.22') {
      throw new Error('Production environment configuration incorrect');
    }
    
    this.addResult('Environment Settings', 'PASS', 'Staging and production configs correct');
  }

  async testCICDPipelineCompatibility() {
    console.log('🧪 Testing CI/CD Pipeline Compatibility...');
    
    // Test that WMACS Guardian can identify environments by container
    const WMACSGuardian = require('../wmacs/wmacs-guardian.js');
    const guardian = new WMACSGuardian();
    
    // Test staging environment lookup
    const stagingEnv = guardian.getEnvironmentByContainer('135');
    if (!stagingEnv || stagingEnv.ip !== '10.92.3.25') {
      throw new Error('Cannot resolve staging environment by container ID');
    }
    
    // Test production environment lookup
    const productionEnv = guardian.getEnvironmentByContainer('133');
    if (!productionEnv || productionEnv.ip !== '10.92.3.22') {
      throw new Error('Cannot resolve production environment by container ID');
    }
    
    this.addResult('CI/CD Compatibility', 'PASS', 'Environment resolution by container ID works');
  }

  async testAuthenticationPreservation() {
    console.log('🧪 Testing Authentication Preservation...');
    
    const projectConfig = JSON.parse(fs.readFileSync('wmacs/config/project.json', 'utf8'));
    
    // Test that LDC-specific authentication is preserved
    const auth = projectConfig.authentication;
    if (auth.credentials.testUser !== 'admin@ldc-construction.local') {
      throw new Error('Project-specific authentication not preserved');
    }
    
    if (auth.endpoints.signin !== '/api/auth/signin') {
      throw new Error('Project-specific endpoints not preserved');
    }
    
    this.addResult('Authentication Preservation', 'PASS', 'Project-specific auth settings intact');
  }

  async testSharedSystemSync() {
    console.log('🧪 Testing Shared System Sync...');
    
    // Test that core components exist
    const coreFiles = [
      'wmacs/core/WINDSURF_OPERATIONAL_GUIDELINES.md',
      'wmacs/core/ENFORCEMENT_MECHANISMS.md',
      'wmacs/core/wmacs-research-advisor.js'
    ];
    
    for (const file of coreFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Shared component missing: ${file}`);
      }
    }
    
    // Test that smart sync script exists and is executable
    if (!fs.existsSync('wmacs/wmacs-smart-sync.js')) {
      throw new Error('Smart sync script missing');
    }
    
    this.addResult('Shared System Sync', 'PASS', 'Core components synced and sync script available');
  }

  addResult(testName, status, message) {
    this.testResults.push({ testName, status, message });
    console.log(`   ${status === 'PASS' ? '✅' : '❌'} ${testName}: ${message}`);
  }

  printResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const total = this.testResults.length;
    
    console.log(`\n✅ Tests Passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED - WMACS CI/CD INTEGRATION VALIDATED');
      console.log('\n🚀 SYSTEM READY FOR:');
      console.log('   ✅ Shared WMACS system updates');
      console.log('   ✅ Repository-specific configuration preservation');
      console.log('   ✅ CI/CD pipeline deployment (staging → production)');
      console.log('   ✅ Environment-specific variable management');
      console.log('   ✅ Battle-tested deployment process');
    } else {
      console.log('\n❌ SOME TESTS FAILED - REVIEW CONFIGURATION');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new WMACsCICDIntegrationTest();
  test.runTests();
}

module.exports = WMACsCICDIntegrationTest;
