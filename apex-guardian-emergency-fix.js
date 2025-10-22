const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function apexGuardianEmergencyFix() {
  console.log('🛡️ APEX GUARDIAN - EMERGENCY NULL SHIFT FIX');
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
    
    console.log(`Found ${nullShiftAssignments.length} assignments with null shifts:`);
    nullShiftAssignments.forEach((assignment, i) => {
      console.log(`${i + 1}. ${assignment.attendant?.firstName} ${assignment.attendant?.lastName} - ${assignment.role} at ${assignment.position.name}`);
    });
    
    if (nullShiftAssignments.length === 0) {
      console.log('✅ No null shift assignments found - error might be elsewhere');
      return;
    }
    
    // 2. Find or create "All Day" shifts for positions
    console.log('\n📊 2. FIXING NULL SHIFT REFERENCES');
    console.log('-'.repeat(50));
    
    let fixedCount = 0;
    
    for (const assignment of nullShiftAssignments) {
      // Find existing "All Day" shift for this position
      let allDayShift = await prisma.position_shifts.findFirst({
        where: {
          positionId: assignment.positionId,
          name: 'All Day'
        }
      });
      
      // Create "All Day" shift if it doesn't exist
      if (!allDayShift) {
        console.log(`Creating All Day shift for ${assignment.position.name}`);
        allDayShift = await prisma.position_shifts.create({
          data: {
            id: require('crypto').randomUUID(),
            positionId: assignment.positionId,
            name: 'All Day',
            startTime: null,
            endTime: null,
            isAllDay: true,
            sequence: 1
          }
        });
      }
      
      // Update assignment with shift reference
      await prisma.position_assignments.update({
        where: { id: assignment.id },
        data: { shiftId: allDayShift.id }
      });
      
      console.log(`✅ Fixed: ${assignment.attendant?.firstName} ${assignment.attendant?.lastName} - ${assignment.role} at ${assignment.position.name}`);
      fixedCount++;
    }
    
    console.log(`\n🎯 EMERGENCY FIX COMPLETE: ${fixedCount} assignments fixed`);
    
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
    
    if (remainingNullShifts === 0) {
      console.log('✅ ALL NULL SHIFT REFERENCES FIXED');
      console.log('💡 Internal server error should be resolved');
    } else {
      console.log('⚠️  Some null shift references remain');
    }
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN EMERGENCY FIX ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

apexGuardianEmergencyFix();
