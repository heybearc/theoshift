#!/usr/bin/env node

// WMACS Guardian: Roadmap vs Implementation Audit
// Compares claimed roadmap completion against actual Next.js implementation

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class WMACSRoadmapAudit {
  constructor() {
    this.auditResults = {
      phase1: { claimed: [], actual: [], gaps: [] },
      phase2: { claimed: [], actual: [], gaps: [] },
      phase3: { claimed: [], actual: [], gaps: [] },
      adminModule: { claimed: [], actual: [], gaps: [] }
    };
  }

  async runComprehensiveAudit() {
    console.log('🔍 WMACS Guardian: Starting Roadmap vs Implementation Audit...\n');
    
    // Phase 1: Event Foundation Analysis
    await this.auditPhase1();
    
    // Phase 2: Core Operations Analysis  
    await this.auditPhase2();
    
    // Admin Module Analysis
    await this.auditAdminModule();
    
    // Database Schema Analysis
    await this.auditDatabaseSchema();
    
    // API Endpoints Analysis
    await this.auditAPIEndpoints();
    
    this.generateAuditReport();
  }

  async auditPhase1() {
    console.log('🔍 Phase 1: Event Foundation Audit');
    
    // Roadmap Claims for Phase 1
    const phase1Claims = [
      'Event-Centric Navigation',
      'Advanced User Management System', 
      'Position Management System'
    ];
    
    this.auditResults.phase1.claimed = phase1Claims;
    
    // Check actual implementation
    const actualImplementation = [];
    
    // Check for event-centric navigation
    if (await this.checkFileExists('src/app/page.tsx')) {
      const pageContent = await this.readFile('src/app/page.tsx');
      if (pageContent.includes('dashboard') || pageContent.includes('event')) {
        actualImplementation.push('Basic Navigation (redirects to signin)');
      }
    }
    
    // Check for user management
    if (await this.checkFileExists('src/app/users')) {
      actualImplementation.push('User Management Pages');
    }
    
    // Check for position management
    if (await this.checkFileExists('src/app/positions')) {
      actualImplementation.push('Position Management Pages');
    } else {
      this.auditResults.phase1.gaps.push('Position Management System - NOT IMPLEMENTED');
    }
    
    // Check authentication system
    if (await this.checkFileExists('auth.ts') || await this.checkFileExists('auth.config.ts')) {
      actualImplementation.push('Authentication System (NextAuth)');
    }
    
    this.auditResults.phase1.actual = actualImplementation;
    
    console.log('   📋 Claimed:', phase1Claims.length, 'features');
    console.log('   ✅ Actual:', actualImplementation.length, 'features');
    console.log('   ❌ Gaps:', this.auditResults.phase1.gaps.length, 'missing features');
  }

  async auditPhase2() {
    console.log('\n🔍 Phase 2: Core Operations Audit');
    
    const phase2Claims = [
      'Count Times System',
      'Auto-Assignment Engine',
      'Oversight Management',
      'Email Communication System'
    ];
    
    this.auditResults.phase2.claimed = phase2Claims;
    const actualImplementation = [];
    
    // Check for count times
    if (await this.checkFileExists('src/app/count-times')) {
      actualImplementation.push('Count Times System');
    } else {
      this.auditResults.phase2.gaps.push('Count Times System - NOT IMPLEMENTED');
    }
    
    // Check for auto-assignment
    if (await this.checkFileExists('src/app/assignments')) {
      actualImplementation.push('Assignment System');
    } else {
      this.auditResults.phase2.gaps.push('Auto-Assignment Engine - NOT IMPLEMENTED');
    }
    
    // Check for oversight management
    if (await this.checkFileExists('src/app/oversight')) {
      actualImplementation.push('Oversight Management');
    } else {
      this.auditResults.phase2.gaps.push('Oversight Management - NOT IMPLEMENTED');
    }
    
    // Check for email system (this might be in admin)
    if (await this.checkFileExists('src/app/admin') || await this.checkFileExists('src/app/email')) {
      actualImplementation.push('Email System (Basic)');
    }
    
    this.auditResults.phase2.actual = actualImplementation;
    
    console.log('   📋 Claimed:', phase2Claims.length, 'features');
    console.log('   ✅ Actual:', actualImplementation.length, 'features');
    console.log('   ❌ Gaps:', this.auditResults.phase2.gaps.length, 'missing features');
  }

  async auditAdminModule() {
    console.log('\n🔍 Admin Module Audit');
    
    const adminClaims = [
      'User Management Sub-Module',
      'Email Configuration Sub-Module', 
      'Bulk Operations Sub-Module',
      'Role Management Sub-Module',
      'System Settings Sub-Module',
      'Audit & Logging Sub-Module'
    ];
    
    this.auditResults.adminModule.claimed = adminClaims;
    const actualImplementation = [];
    
    // Check admin directory structure
    if (await this.checkFileExists('src/app/admin')) {
      actualImplementation.push('Admin Module Structure');
      
      // Check specific admin features
      const adminFiles = await this.listDirectory('src/app/admin');
      if (adminFiles.includes('users')) {
        actualImplementation.push('User Management Pages');
      }
      if (adminFiles.includes('email')) {
        actualImplementation.push('Email Configuration Pages');
      }
    } else {
      this.auditResults.adminModule.gaps.push('Admin Module - NOT IMPLEMENTED');
    }
    
    this.auditResults.adminModule.actual = actualImplementation;
    
    console.log('   📋 Claimed:', adminClaims.length, 'features');
    console.log('   ✅ Actual:', actualImplementation.length, 'features');
    console.log('   ❌ Gaps:', this.auditResults.adminModule.gaps.length, 'missing features');
  }

  async auditDatabaseSchema() {
    console.log('\n🔍 Database Schema Audit');
    
    try {
      if (await this.checkFileExists('prisma/schema.prisma')) {
        const schemaContent = await this.readFile('prisma/schema.prisma');
        
        const models = schemaContent.match(/model\s+(\w+)/g) || [];
        console.log('   📊 Database Models Found:', models.length);
        models.forEach(model => {
          console.log('     -', model.replace('model ', ''));
        });
        
        // Check for key models mentioned in roadmap
        const keyModels = ['users', 'events', 'positions', 'assignments', 'attendants'];
        const missingModels = keyModels.filter(model => 
          !schemaContent.toLowerCase().includes(`model ${model}`)
        );
        
        if (missingModels.length > 0) {
          console.log('   ❌ Missing Key Models:', missingModels.join(', '));
        }
      } else {
        console.log('   ❌ No Prisma schema found');
      }
    } catch (error) {
      console.log('   ❌ Error reading database schema:', error.message);
    }
  }

  async auditAPIEndpoints() {
    console.log('\n🔍 API Endpoints Audit');
    
    try {
      if (await this.checkFileExists('src/app/api')) {
        const apiDirs = await this.listDirectory('src/app/api', true);
        console.log('   🔌 API Endpoints Found:', apiDirs.length);
        apiDirs.forEach(endpoint => {
          console.log('     -', endpoint);
        });
      } else {
        console.log('   ❌ No API directory found');
      }
    } catch (error) {
      console.log('   ❌ Error reading API endpoints:', error.message);
    }
  }

  generateAuditReport() {
    console.log('\n📊 WMACS Guardian Audit Report');
    console.log('=====================================');
    
    const totalClaimed = 
      this.auditResults.phase1.claimed.length +
      this.auditResults.phase2.claimed.length +
      this.auditResults.adminModule.claimed.length;
      
    const totalActual = 
      this.auditResults.phase1.actual.length +
      this.auditResults.phase2.actual.length +
      this.auditResults.adminModule.actual.length;
      
    const totalGaps = 
      this.auditResults.phase1.gaps.length +
      this.auditResults.phase2.gaps.length +
      this.auditResults.adminModule.gaps.length;
    
    console.log(`📋 Total Features Claimed: ${totalClaimed}`);
    console.log(`✅ Total Features Actually Implemented: ${totalActual}`);
    console.log(`❌ Total Implementation Gaps: ${totalGaps}`);
    console.log(`📈 Implementation Accuracy: ${Math.round((totalActual / totalClaimed) * 100)}%`);
    
    console.log('\n🚨 CRITICAL GAPS IDENTIFIED:');
    [...this.auditResults.phase1.gaps, ...this.auditResults.phase2.gaps, ...this.auditResults.adminModule.gaps]
      .forEach((gap, index) => {
        console.log(`${index + 1}. ${gap}`);
      });
    
    console.log('\n🎯 WMACS Guardian Recommendation:');
    if (totalGaps > totalActual) {
      console.log('❌ ROADMAP IS SIGNIFICANTLY INACCURATE');
      console.log('   - Roadmap reflects Django implementation, not Next.js clean slate');
      console.log('   - Need to create accurate roadmap based on actual implementation');
      console.log('   - Prioritize core missing features for immediate development');
    } else {
      console.log('✅ Implementation is reasonably aligned with roadmap');
    }
  }

  // Helper methods
  async checkFileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath) {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch {
      return '';
    }
  }

  async listDirectory(dirPath, recursive = false) {
    try {
      const items = await fs.promises.readdir(dirPath);
      if (recursive) {
        const result = [];
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = await fs.promises.stat(itemPath);
          if (stat.isDirectory()) {
            result.push(item);
          }
        }
        return result;
      }
      return items;
    } catch {
      return [];
    }
  }
}

// Run audit
const auditor = new WMACSRoadmapAudit();
auditor.runComprehensiveAudit().catch(console.error);
