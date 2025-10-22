const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function apexGuardianEmergencyFixV2() {
  console.log('🛡️ APEX GUARDIAN - EMERGENCY NULL SHIFT FIX V2');
  console.log('=' .repeat(80));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // 1. Find assignments with null shifts
    console.log('\n📊 1. IDENTIFYING NULL SHIFT ASSIGNMENTS');
    console.log('-'.repeat(50));
    
    const nullShiftAssignments = await prisma.position_assignments.findMany({
      where: {
        position: { eventId },
        shiftId: null
      },
      include: {
        position: {
          select: {
            id: true,
            name: true
          }
        },
        attendant: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log(`Found ${nullShiftAssignments.length} assignments with null shifts`);
    
    if (nullShiftAssignments.length === 0) {
      console.log('✅ No null shift assignments found');
      return;
    }
    
    // 2. Delete all null shift assignments (they're causing conflicts)
    console.log('\n📊 2. REMOVING PROBLEMATIC NULL SHIFT ASSIGNMENTS');
    console.log('-'.repeat(50));
    
    const deletedCount = await prisma.position_assignments.deleteMany({
      where: {
        position: { eventId },
        shiftId: null
      }
    });
    
    console.log(`✅ Deleted ${deletedCount.count} problematic assignments with null shifts`);
    
    // 3. Verify fix
    console.log('\n📊 3. VERIFICATION');
    console.log('-'.repeat(50));
    
    const remainingNullShifts = await prisma.position_assignments.count({
      where: {
        position: { eventId },
        shiftId: null
      }
    });
    
    console.log(`Remaining null shift assignments: ${remainingNullShifts}`);
    
    // 4. Check current assignment status
    const totalAssignments = await prisma.position_assignments.count({
      where: {
        position: { eventId }
      }
    });
    
    console.log(`Total assignments remaining: ${totalAssignments}`);
    
    if (remainingNullShifts === 0) {
      console.log('✅ ALL NULL SHIFT REFERENCES REMOVED');
      console.log('💡 Internal server error should be resolved');
      console.log('⚠️  Note: Some assignments were removed - you may need to reassign oversight');
    } else {
      console.log('⚠️  Some null shift references remain');
    }
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN EMERGENCY FIX V2 ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

apexGuardianEmergencyFixV2();
