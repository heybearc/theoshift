const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function apexGuardianSystemAudit() {
  console.log('🔍 APEX GUARDIAN - COMPREHENSIVE SYSTEM AUDIT INITIATED');
  console.log('=' .repeat(80));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  const auditResults = {
    timestamp: new Date().toISOString(),
    eventId,
    conflicts: [],
    recommendations: [],
    backupRequired: false,
    migrationRequired: false
  };
  
  try {
    // 1. DATABASE SCHEMA ANALYSIS
    console.log('\n📊 1. DATABASE SCHEMA ANALYSIS');
    console.log('-'.repeat(50));
    
    // Check table existence and structure
    const tables = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('positions', 'position_assignments', 'position_shifts', 'event_positions', 'assignments', 'event_attendant_associations', 'attendants')
      ORDER BY table_name, ordinal_position;
    `;
    
    const tableGroups = {};
    tables.forEach(row => {
      if (!tableGroups[row.table_name]) {
        tableGroups[row.table_name] = [];
      }
      tableGroups[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable
      });
    });
    
    console.log('Database Tables Found:');
    Object.keys(tableGroups).forEach(tableName => {
      console.log(`  ✅ ${tableName} (${tableGroups[tableName].length} columns)`);
    });
    
    // 2. DATA CONSISTENCY ANALYSIS
    console.log('\n📊 2. DATA CONSISTENCY ANALYSIS');
    console.log('-'.repeat(50));
    
    // OLD SYSTEM counts
    const oldPositions = await prisma.event_positions.count({ where: { eventId } });
    const oldAssignments = await prisma.assignments.count({
      where: { eventId }
    });
    const oldAttendantAssoc = await prisma.event_attendant_associations.count({
      where: { eventId }
    });
    
    // NEW SYSTEM counts
    const newPositions = await prisma.positions.count({ where: { eventId } });
    const newAssignments = await prisma.position_assignments.count({
      where: { position: { eventId } }
    });
    const newShifts = await prisma.position_shifts.count({
      where: { position: { eventId } }
    });
    
    console.log('OLD SYSTEM:');
    console.log(`  event_positions: ${oldPositions}`);
    console.log(`  assignments: ${oldAssignments}`);
    console.log(`  event_attendant_associations: ${oldAttendantAssoc}`);
    
    console.log('NEW SYSTEM:');
    console.log(`  positions: ${newPositions}`);
    console.log(`  position_assignments: ${newAssignments}`);
    console.log(`  position_shifts: ${newShifts}`);
    
    // 3. ATTENDANT DATA ANALYSIS
    console.log('\n📊 3. ATTENDANT DATA ANALYSIS');
    console.log('-'.repeat(50));
    
    const totalAttendants = await prisma.attendants.count();
    console.log(`Total attendants in system: ${totalAttendants}`);
    
    // Attendants in OLD system
    const attendantsInOld = await prisma.attendants.count({
      where: {
        event_attendant_associations: {
          some: { eventId }
        }
      }
    });
    
    // Attendants in NEW system
    const attendantsInNew = await prisma.attendants.count({
      where: {
        position_assignments: {
          some: {
            position: { eventId }
          }
        }
      }
    });
    
    console.log(`Attendants in OLD system: ${attendantsInOld}`);
    console.log(`Attendants in NEW system: ${attendantsInNew}`);
    
    // 4. API ENDPOINT ANALYSIS
    console.log('\n📊 4. API ENDPOINT ANALYSIS');
    console.log('-'.repeat(50));
    
    const apiFiles = [
      'pages/api/events/[id]/attendants/[attendantId].ts',
      'pages/api/events/[id]/attendants/[attendantId]/leadership.ts',
      'pages/api/events/[id]/positions/[positionId].ts',
      'pages/events/[id]/attendants.tsx',
      'pages/events/[id]/positions.tsx'
    ];
    
    for (const apiFile of apiFiles) {
      const fullPath = path.join(process.cwd(), apiFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const usesOldSystem = content.includes('event_attendant_associations') || content.includes('event_positions');
        const usesNewSystem = content.includes('position_assignments') || content.includes('positions');
        
        console.log(`${apiFile}:`);
        console.log(`  Uses OLD system: ${usesOldSystem ? '❌ YES' : '✅ NO'}`);
        console.log(`  Uses NEW system: ${usesNewSystem ? '✅ YES' : '❌ NO'}`);
        
        if (usesOldSystem && usesNewSystem) {
          auditResults.conflicts.push(`MIXED SYSTEM: ${apiFile} uses both OLD and NEW systems`);
        } else if (usesOldSystem) {
          auditResults.conflicts.push(`OLD SYSTEM: ${apiFile} still uses OLD system`);
        }
      }
    }
    
    // 5. FRONTEND PAGE ANALYSIS
    console.log('\n📊 5. FRONTEND PAGE ANALYSIS');
    console.log('-'.repeat(50));
    
    // Check what the frontend pages are actually querying
    const attendantsPageContent = fs.readFileSync('pages/events/[id]/attendants.tsx', 'utf8');
    const positionsPageContent = fs.readFileSync('pages/events/[id]/positions.tsx', 'utf8');
    
    console.log('Event Attendants Page:');
    console.log(`  Queries positions: ${attendantsPageContent.includes('positions:') ? '✅ YES' : '❌ NO'}`);
    console.log(`  Queries event_attendant_associations: ${attendantsPageContent.includes('event_attendant_associations') ? '❌ YES' : '✅ NO'}`);
    
    console.log('Event Positions Page:');
    console.log(`  Queries positions: ${positionsPageContent.includes('positions:') ? '✅ YES' : '❌ NO'}`);
    console.log(`  Queries event_positions: ${positionsPageContent.includes('event_positions') ? '❌ YES' : '✅ NO'}`);
    
    // 6. CRITICAL CONFLICT DETECTION
    console.log('\n🚨 6. CRITICAL CONFLICT DETECTION');
    console.log('-'.repeat(50));
    
    if (oldPositions > 0 && newPositions > 0) {
      auditResults.conflicts.push('DUAL POSITION SYSTEMS: Both old and new position systems have data');
      auditResults.migrationRequired = true;
    }
    
    if (oldAttendantAssoc > 0 && newAssignments > 0) {
      auditResults.conflicts.push('DUAL ASSIGNMENT SYSTEMS: Both old and new assignment systems have data');
      auditResults.migrationRequired = true;
    }
    
    if (attendantsInOld !== attendantsInNew) {
      auditResults.conflicts.push(`ATTENDANT MISMATCH: OLD system has ${attendantsInOld} attendants, NEW system has ${attendantsInNew}`);
      auditResults.migrationRequired = true;
    }
    
    // 7. RECOMMENDATIONS
    console.log('\n💡 7. APEX GUARDIAN RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    if (auditResults.conflicts.length > 0) {
      auditResults.backupRequired = true;
      auditResults.recommendations.push('IMMEDIATE BACKUP REQUIRED before any migration');
      auditResults.recommendations.push('COMPLETE DATA MIGRATION from OLD to NEW system');
      auditResults.recommendations.push('REMOVE OLD SYSTEM tables after successful migration');
      auditResults.recommendations.push('UPDATE ALL API endpoints to use NEW system exclusively');
      auditResults.recommendations.push('VERIFY FRONTEND consistency across all pages');
    }
    
    console.log('Conflicts Found:');
    auditResults.conflicts.forEach(conflict => {
      console.log(`  🚨 ${conflict}`);
    });
    
    console.log('\nRecommendations:');
    auditResults.recommendations.forEach(rec => {
      console.log(`  💡 ${rec}`);
    });
    
    // Save audit results
    fs.writeFileSync('apex-guardian-audit-results.json', JSON.stringify(auditResults, null, 2));
    console.log('\n✅ Audit results saved to apex-guardian-audit-results.json');
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN AUDIT ERROR:', error);
    auditResults.conflicts.push(`AUDIT ERROR: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
  
  return auditResults;
}

// Execute the audit
apexGuardianSystemAudit()
  .then(results => {
    console.log('\n🎯 APEX GUARDIAN AUDIT COMPLETE');
    console.log(`Migration Required: ${results.migrationRequired ? '🚨 YES' : '✅ NO'}`);
    console.log(`Backup Required: ${results.backupRequired ? '🚨 YES' : '✅ NO'}`);
    process.exit(results.conflicts.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('🚨 APEX GUARDIAN CRITICAL ERROR:', error);
    process.exit(1);
  });
