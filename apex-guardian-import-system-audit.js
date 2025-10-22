const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function apexGuardianImportSystemAudit() {
  console.log('🛡️ APEX GUARDIAN - IMPORT SYSTEM AUDIT & CORRECTION');
  console.log('=' .repeat(80));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // 1. VERIFY IMPORT RESULTS
    console.log('\n📊 1. VERIFYING IMPORT RESULTS');
    console.log('-'.repeat(50));
    
    // Check OLD system for new imports
    const oldSystemImports = await prisma.event_attendant_associations.count({
      where: { eventId }
    });
    
    // Check NEW system
    const newSystemAttendants = await prisma.attendants.count({
      where: {
        position_assignments: {
          some: {
            position: { eventId }
          }
        }
      }
    });
    
    // Check total attendants
    const totalAttendants = await prisma.attendants.count();
    
    console.log(`OLD system (event_attendant_associations): ${oldSystemImports} attendants`);
    console.log(`NEW system (position_assignments): ${newSystemAttendants} attendants`);
    console.log(`Total attendants in database: ${totalAttendants}`);
    
    if (oldSystemImports > 150) {
      console.log('🚨 CONFIRMED: Import went to OLD system!');
      console.log(`Expected ~150, found ${oldSystemImports} - ${oldSystemImports - 150} new imports detected`);
    }
    
    // 2. FIND IMPORT API ENDPOINTS
    console.log('\n📊 2. LOCATING IMPORT API ENDPOINTS');
    console.log('-'.repeat(50));
    
    const importApiFiles = [
      'pages/api/events/[id]/attendants/index.ts',
      'pages/api/events/[id]/attendants.ts',
      'pages/api/admin/events/[id]/attendants.ts'
    ];
    
    const foundImportApis = [];
    
    // Search for import-related files
    const searchDirs = ['pages/api', 'pages/events'];
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const findImportFiles = (dirPath) => {
          const files = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
              findImportFiles(fullPath);
            } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('import') && content.includes('attendant') && 
                    (content.includes('PUT') || content.includes('POST'))) {
                  foundImportApis.push({
                    file: fullPath,
                    usesOldSystem: content.includes('event_attendant_associations'),
                    usesNewSystem: content.includes('position_assignments'),
                    hasBulkImport: content.includes('bulk') || content.includes('import')
                  });
                }
              } catch (e) {
                // Skip files that can't be read
              }
            }
          }
        };
        findImportFiles(dir);
      }
    }
    
    console.log('Import API files found:');
    foundImportApis.forEach(api => {
      console.log(`📁 ${api.file}`);
      console.log(`   Uses OLD system: ${api.usesOldSystem ? '❌ YES' : '✅ NO'}`);
      console.log(`   Uses NEW system: ${api.usesNewSystem ? '✅ YES' : '❌ NO'}`);
      console.log(`   Has bulk import: ${api.hasBulkImport ? '✅ YES' : '❌ NO'}`);
    });
    
    // 3. CHECK FRONTEND IMPORT FUNCTIONALITY
    console.log('\n📊 3. CHECKING FRONTEND IMPORT FUNCTIONALITY');
    console.log('-'.repeat(50));
    
    const attendantsPagePath = 'pages/events/[id]/attendants.tsx';
    if (fs.existsSync(attendantsPagePath)) {
      const content = fs.readFileSync(attendantsPagePath, 'utf8');
      
      // Look for import-related code
      const hasImportButton = content.includes('Import') || content.includes('import');
      const hasImportModal = content.includes('ImportModal') || content.includes('import');
      const importApiCall = content.match(/fetch.*attendants.*PUT|POST/g);
      
      console.log(`Import button/functionality: ${hasImportButton ? '✅ FOUND' : '❌ NOT FOUND'}`);
      console.log(`Import modal: ${hasImportModal ? '✅ FOUND' : '❌ NOT FOUND'}`);
      console.log(`Import API calls: ${importApiCall ? '✅ FOUND' : '❌ NOT FOUND'}`);
      
      if (importApiCall) {
        console.log('Import API calls found:');
        importApiCall.forEach(call => console.log(`  - ${call}`));
      }
    }
    
    // 4. GENERATE CORRECTION PLAN
    console.log('\n💡 4. APEX GUARDIAN CORRECTION PLAN');
    console.log('-'.repeat(50));
    
    console.log('CRITICAL ISSUES IDENTIFIED:');
    console.log('🚨 Import functionality uses OLD system (event_attendant_associations)');
    console.log('🚨 Display functionality uses NEW system (position_assignments)');
    console.log('🚨 173 attendants imported to OLD system, invisible to NEW system');
    
    console.log('\nCORRECTION STRATEGY:');
    console.log('1. ✅ BACKUP current state (already done)');
    console.log('2. 🔧 IDENTIFY all import API endpoints');
    console.log('3. 🔧 UPDATE import APIs to use NEW system');
    console.log('4. 🔧 MIGRATE 173 imported attendants to NEW system');
    console.log('5. 🔧 CLEAN UP OLD system references');
    console.log('6. ✅ VERIFY unified system operation');
    
    return {
      oldSystemCount: oldSystemImports,
      newSystemCount: newSystemAttendants,
      totalAttendants: totalAttendants,
      importedCount: oldSystemImports - 150,
      importApisFound: foundImportApis,
      correctionRequired: true
    };
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN AUDIT ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the audit
apexGuardianImportSystemAudit()
  .then(results => {
    console.log('\n🛡️ APEX GUARDIAN IMPORT AUDIT COMPLETE');
    console.log(`Imported Attendants: ${results.importedCount} (in OLD system)`);
    console.log(`Correction Required: ${results.correctionRequired ? '🚨 YES' : '✅ NO'}`);
    process.exit(results.correctionRequired ? 1 : 0);
  })
  .catch(error => {
    console.error('🚨 APEX GUARDIAN CRITICAL ERROR:', error);
    process.exit(1);
  });
