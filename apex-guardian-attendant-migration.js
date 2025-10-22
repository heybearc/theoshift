const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function apexGuardianAttendantMigration() {
  console.log('🛡️ APEX GUARDIAN - ATTENDANT MIGRATION FROM OLD TO NEW SYSTEM');
  console.log('=' .repeat(80));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // 1. ANALYZE CURRENT STATE
    console.log('\n📊 1. ANALYZING CURRENT STATE');
    console.log('-'.repeat(50));
    
    // Count attendants in OLD system
    const oldSystemAssociations = await prisma.event_attendant_associations.findMany({
      where: { eventId },
      include: {
        attendants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true
          }
        }
      }
    });
    
    // Count attendants in NEW system
    const newSystemAttendants = await prisma.attendants.findMany({
      where: {
        position_assignments: {
          some: {
            position: { eventId }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
    
    console.log(`OLD system associations: ${oldSystemAssociations.length}`);
    console.log(`NEW system attendants with assignments: ${newSystemAttendants.length}`);
    
    // Find attendants that are in OLD system but not in NEW system
    const newSystemIds = new Set(newSystemAttendants.map(a => a.id));
    const attendantsToMigrate = oldSystemAssociations.filter(assoc => 
      assoc.attendants && !newSystemIds.has(assoc.attendants.id)
    );
    
    console.log(`Attendants needing migration: ${attendantsToMigrate.length}`);
    
    // 2. MIGRATION STRATEGY
    console.log('\n💡 2. APEX GUARDIAN MIGRATION STRATEGY');
    console.log('-'.repeat(50));
    
    console.log('STRATEGY: Clean Import Approach');
    console.log('✅ Keep attendants in attendants table (they are valid)');
    console.log('✅ Remove OLD system associations (event_attendant_associations)');
    console.log('✅ Attendants become available for position assignment');
    console.log('✅ No fake position assignments created');
    console.log('❌ Attendants won\'t show in displays until assigned to positions');
    
    // 3. EXECUTE MIGRATION
    console.log('\n🔄 3. EXECUTING MIGRATION');
    console.log('-'.repeat(50));
    
    if (attendantsToMigrate.length === 0) {
      console.log('✅ No migration needed - all attendants already in NEW system');
      return { migrated: 0, cleaned: 0 };
    }
    
    console.log(`Processing ${attendantsToMigrate.length} attendants...`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const assoc of attendantsToMigrate) {
      try {
        if (assoc.attendants) {
          console.log(`✅ Attendant available for assignment: ${assoc.attendants.firstName} ${assoc.attendants.lastName}`);
          migrated++;
        }
      } catch (error) {
        console.error(`❌ Error processing attendant:`, error);
        errors++;
      }
    }
    
    // 4. CLEAN UP OLD SYSTEM ASSOCIATIONS
    console.log('\n🧹 4. CLEANING UP OLD SYSTEM ASSOCIATIONS');
    console.log('-'.repeat(50));
    
    console.log('🚨 WARNING: About to remove OLD system associations');
    console.log('This will make imported attendants invisible in OLD system displays');
    console.log('But they will be available for position assignment in NEW system');
    
    // Remove OLD system associations for this event
    const deletedAssociations = await prisma.event_attendant_associations.deleteMany({
      where: { eventId }
    });
    
    console.log(`✅ Cleaned up ${deletedAssociations.count} OLD system associations`);
    
    // 5. VERIFICATION
    console.log('\n✅ 5. MIGRATION VERIFICATION');
    console.log('-'.repeat(50));
    
    // Verify OLD system is clean
    const remainingOldAssociations = await prisma.event_attendant_associations.count({
      where: { eventId }
    });
    
    // Count total attendants available for assignment
    const totalAttendants = await prisma.attendants.count({
      where: { isActive: true }
    });
    
    // Count attendants with position assignments
    const assignedAttendants = await prisma.attendants.count({
      where: {
        position_assignments: {
          some: {
            position: { eventId }
          }
        }
      }
    });
    
    console.log(`OLD system associations remaining: ${remainingOldAssociations}`);
    console.log(`Total active attendants available: ${totalAttendants}`);
    console.log(`Attendants with position assignments: ${assignedAttendants}`);
    console.log(`Attendants available for assignment: ${totalAttendants - assignedAttendants}`);
    
    console.log('\n🎯 MIGRATION COMPLETE');
    console.log('✅ OLD system associations removed');
    console.log('✅ Attendants available for position assignment');
    console.log('📝 NOTE: Attendants won\'t appear in displays until assigned to positions');
    console.log('📝 Use the assignment dropdowns to assign attendants to positions');
    
    return {
      migrated: migrated,
      cleaned: deletedAssociations.count,
      totalAvailable: totalAttendants,
      currentlyAssigned: assignedAttendants,
      availableForAssignment: totalAttendants - assignedAttendants
    };
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN MIGRATION ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
apexGuardianAttendantMigration()
  .then(result => {
    console.log('\n🛡️ APEX GUARDIAN MIGRATION COMPLETE');
    console.log(`Migrated: ${result.migrated} attendants`);
    console.log(`Cleaned: ${result.cleaned} OLD associations`);
    console.log(`Available for assignment: ${result.availableForAssignment} attendants`);
    process.exit(0);
  })
  .catch(error => {
    console.error('🚨 APEX GUARDIAN MIGRATION FAILED:', error);
    process.exit(1);
  });
