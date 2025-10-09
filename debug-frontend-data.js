const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFrontendData() {
  console.log('🔍 Debugging frontend data fetching...');
  
  // Check what the API endpoint returns (same as frontend fetches)
  const positions = await prisma.positions.findMany({
    where: { 
      eventId: '1',
      isActive: true
    },
    include: {
      assignments: {
        include: {
          attendant: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          overseer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          keyman: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          shift: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
              isAllDay: true
            }
          }
        }
      },
      shifts: {
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          isAllDay: true
        }
      }
    },
    orderBy: { positionNumber: 'asc' }
  });
  
  console.log(`\n📊 Found ${positions.length} active positions for event 1`);
  
  // Focus on Station 2 and 3
  const station2 = positions.find(p => p.name.includes('Station 2'));
  const station3 = positions.find(p => p.name.includes('Station 3'));
  
  if (station2) {
    console.log(`\n🏢 ${station2.name}:`);
    console.log(`  - ID: ${station2.id}`);
    console.log(`  - Position Number: ${station2.positionNumber}`);
    console.log(`  - Active: ${station2.isActive}`);
    console.log(`  - Shifts: ${JSON.stringify(station2.shifts, null, 2)}`);
    console.log(`  - Assignments: ${JSON.stringify(station2.assignments, null, 2)}`);
    
    // Check assignment filtering logic
    const attendantAssignments = station2.assignments?.filter(a => a.role === 'ATTENDANT') || [];
    const overseerAssignments = station2.assignments?.filter(a => a.role === 'OVERSEER') || [];
    const keymanAssignments = station2.assignments?.filter(a => a.role === 'KEYMAN') || [];
    
    console.log(`\n  📋 Assignment Analysis:`);
    console.log(`    - Total assignments: ${station2.assignments?.length || 0}`);
    console.log(`    - Attendant assignments: ${attendantAssignments.length}`);
    console.log(`    - Overseer assignments: ${overseerAssignments.length}`);
    console.log(`    - Keyman assignments: ${keymanAssignments.length}`);
    
    if (station2.shifts && station2.shifts.length > 0) {
      station2.shifts.forEach(shift => {
        const shiftAssignments = station2.assignments?.filter(a => a.shift?.id === shift.id) || [];
        const shiftAttendants = shiftAssignments.filter(a => a.role === 'ATTENDANT');
        const shiftOversight = shiftAssignments.filter(a => a.role === 'OVERSEER' || a.role === 'KEYMAN');
        
        console.log(`\n    🕐 ${shift.name} (${shift.id}):`);
        console.log(`      - Total assignments: ${shiftAssignments.length}`);
        console.log(`      - Attendants: ${shiftAttendants.length}`);
        console.log(`      - Oversight: ${shiftOversight.length}`);
        console.log(`      - Assignment details:`, shiftAssignments.map(a => ({
          role: a.role,
          attendant: a.attendant ? `${a.attendant.firstName} ${a.attendant.lastName}` : 'None',
          shiftId: a.shiftId,
          hasShift: !!a.shift
        })));
      });
    }
  }
  
  if (station3) {
    console.log(`\n🏢 ${station3.name}:`);
    console.log(`  - ID: ${station3.id}`);
    console.log(`  - Assignments: ${station3.assignments?.length || 0}`);
    console.log(`  - Shifts: ${station3.shifts?.length || 0}`);
  }
  
  await prisma.$disconnect();
}

debugFrontendData().catch(console.error);
