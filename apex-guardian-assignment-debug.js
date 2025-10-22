const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function apexGuardianAssignmentDebug() {
  console.log('🛡️ APEX GUARDIAN - ASSIGNMENT WORKFLOW DEBUG');
  console.log('=' .repeat(80));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // 1. Check for new null shift assignments
    console.log('\n📊 1. NULL SHIFT ASSIGNMENT CHECK');
    console.log('-'.repeat(50));
    
    const nullShiftCount = await prisma.position_assignments.count({
      where: {
        position: { eventId },
        shiftId: null
      }
    });
    
    console.log(`Null shift assignments: ${nullShiftCount}`);
    
    if (nullShiftCount > 0) {
      console.log('🚨 NEW NULL SHIFT ASSIGNMENTS DETECTED - This will cause internal server errors');
      
      const nullShiftAssignments = await prisma.position_assignments.findMany({
        where: {
          position: { eventId },
          shiftId: null
        },
        include: {
          position: { select: { name: true } },
          attendant: { select: { firstName: true, lastName: true } }
        },
        take: 5
      });
      
      console.log('Recent null shift assignments:');
      nullShiftAssignments.forEach((assignment, i) => {
        console.log(`${i + 1}. ${assignment.attendant?.firstName} ${assignment.attendant?.lastName} - ${assignment.role} at ${assignment.position.name}`);
      });
    } else {
      console.log('✅ No null shift assignments found');
    }
    
    // 2. Check recent assignments
    console.log('\n📊 2. RECENT ASSIGNMENT ACTIVITY');
    console.log('-'.repeat(50));
    
    const recentAssignments = await prisma.position_assignments.findMany({
      where: {
        position: { eventId }
      },
      orderBy: { assignedAt: 'desc' },
      take: 10,
      include: {
        position: { select: { name: true } },
        attendant: { select: { firstName: true, lastName: true } },
        shift: { select: { name: true } }
      }
    });
    
    console.log(`Recent assignments (${recentAssignments.length}):`);
    recentAssignments.forEach((assignment, i) => {
      const shiftInfo = assignment.shift?.name || 'NO SHIFT';
      console.log(`${i + 1}. ${assignment.attendant?.firstName} ${assignment.attendant?.lastName} - ${assignment.role} at ${assignment.position.name} (${shiftInfo})`);
    });
    
    // 3. Check for duplicate assignments
    console.log('\n📊 3. DUPLICATE ASSIGNMENT CHECK');
    console.log('-'.repeat(50));
    
    const duplicateCheck = await prisma.$queryRaw`
      SELECT positionId, attendantId, role, COUNT(*) as count
      FROM position_assignments pa
      JOIN positions p ON pa.positionId = p.id
      WHERE p.eventId = ${eventId}
      GROUP BY positionId, attendantId, role
      HAVING COUNT(*) > 1
    `;
    
    console.log(`Duplicate assignments found: ${duplicateCheck.length}`);
    if (duplicateCheck.length > 0) {
      console.log('🚨 DUPLICATE ASSIGNMENTS DETECTED - This can cause unique constraint errors');
      duplicateCheck.forEach((dup, i) => {
        console.log(`${i + 1}. Position: ${dup.positionId}, Attendant: ${dup.attendantId}, Role: ${dup.role}, Count: ${dup.count}`);
      });
    }
    
    // 4. Check shift availability for positions
    console.log('\n📊 4. SHIFT AVAILABILITY CHECK');
    console.log('-'.repeat(50));
    
    const positionsWithoutShifts = await prisma.positions.findMany({
      where: {
        eventId,
        shifts: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true
      },
      take: 5
    });
    
    console.log(`Positions without shifts: ${positionsWithoutShifts.length}`);
    if (positionsWithoutShifts.length > 0) {
      console.log('⚠️  Positions without shifts (will cause assignment failures):');
      positionsWithoutShifts.forEach((pos, i) => {
        console.log(`${i + 1}. ${pos.name}`);
      });
    }
    
    // 5. Test oversight assignment API requirements
    console.log('\n📊 5. OVERSIGHT ASSIGNMENT API REQUIREMENTS');
    console.log('-'.repeat(50));
    
    // Check if we have available overseers and keymen
    const availableOverseers = await prisma.attendants.count({
      where: {
        isActive: true,
        formsOfService: {
          array_contains: 'Overseer'
        }
      }
    });
    
    const availableKeymen = await prisma.attendants.count({
      where: {
        isActive: true,
        formsOfService: {
          array_contains: 'Keyman'
        }
      }
    });
    
    console.log(`Available overseers: ${availableOverseers}`);
    console.log(`Available keymen: ${availableKeymen}`);
    
    // 6. Check for positions that need All Day shifts
    console.log('\n📊 6. ALL DAY SHIFT REQUIREMENT CHECK');
    console.log('-'.repeat(50));
    
    const positionsNeedingAllDay = await prisma.positions.findMany({
      where: {
        eventId,
        shifts: {
          none: {
            name: 'All Day'
          }
        }
      },
      select: {
        id: true,
        name: true
      },
      take: 5
    });
    
    console.log(`Positions needing All Day shift: ${positionsNeedingAllDay.length}`);
    if (positionsNeedingAllDay.length > 0) {
      console.log('⚠️  These positions need All Day shifts for oversight assignments:');
      positionsNeedingAllDay.forEach((pos, i) => {
        console.log(`${i + 1}. ${pos.name}`);
      });
    }
    
    console.log('\n🎯 APEX GUARDIAN ASSIGNMENT DEBUG COMPLETE');
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN ASSIGNMENT DEBUG ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

apexGuardianAssignmentDebug();
