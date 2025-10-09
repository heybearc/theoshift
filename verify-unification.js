const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyUnification() {
  console.log('🔍 Verifying database system unification...');
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  // Test the EXACT query that Event Attendants page now uses (NEW SYSTEM)
  console.log('\n📊 EVENT ATTENDANTS PAGE DATA (NEW SYSTEM):');
  const attendantsPageData = await prisma.events.findUnique({
    where: { id: eventId },
    include: {
      positions: {
        include: {
          assignments: {
            include: {
              attendant: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  // Extract unique attendants (same logic as attendants page)
  const attendantMap = new Map();
  attendantsPageData.positions.forEach(position => {
    position.assignments.forEach(assignment => {
      if (assignment.attendant) {
        const attendantId = assignment.attendant.id;
        if (!attendantMap.has(attendantId)) {
          attendantMap.set(attendantId, {
            id: assignment.attendant.id,
            firstName: assignment.attendant.firstName,
            lastName: assignment.attendant.lastName,
            email: assignment.attendant.email,
            assignments: []
          });
        }
        attendantMap.get(attendantId).assignments.push({
          positionName: position.name,
          role: assignment.role
        });
      }
    });
  });
  
  const attendantsPageAttendants = Array.from(attendantMap.values());
  
  console.log(`Attendants found: ${attendantsPageAttendants.length}`);
  attendantsPageAttendants.forEach((attendant, i) => {
    console.log(`${i + 1}. ${attendant.firstName} ${attendant.lastName} (${attendant.assignments.length} assignments)`);
    attendant.assignments.forEach(assignment => {
      console.log(`   - ${assignment.role} at ${assignment.positionName}`);
    });
  });
  
  // Test the EXACT query that Event Positions page uses (NEW SYSTEM)
  console.log('\n📊 EVENT POSITIONS PAGE DATA (NEW SYSTEM):');
  const positionsPageData = await prisma.events.findUnique({
    where: { id: eventId },
    include: {
      positions: {
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
              shift: {
                select: {
                  id: true,
                  name: true,
                  isAllDay: true
                }
              }
            }
          },
          shifts: true
        },
        orderBy: [
          { positionNumber: 'asc' }
        ]
      }
    }
  });
  
  const station2 = positionsPageData.positions.find(p => p.name.includes('Station 2'));
  if (station2) {
    console.log(`\nStation 2 - ${station2.name}:`);
    console.log(`Total assignments: ${station2.assignments.length}`);
    console.log(`Shifts: ${station2.shifts.length}`);
    
    if (station2.shifts.length > 0) {
      const shift = station2.shifts[0];
      const shiftAssignments = station2.assignments.filter(a => a.shift?.id === shift.id);
      const attendants = shiftAssignments.filter(a => a.role === 'ATTENDANT');
      const oversight = shiftAssignments.filter(a => a.role === 'OVERSEER' || a.role === 'KEYMAN');
      
      console.log(`\nShift: ${shift.name}`);
      console.log(`  - Attendants: ${attendants.length}`);
      console.log(`  - Oversight: ${oversight.length}`);
      
      attendants.forEach(a => {
        console.log(`    ✅ ${a.attendant.firstName} ${a.attendant.lastName} (ATTENDANT)`);
      });
      oversight.forEach(a => {
        console.log(`    🔵 ${a.attendant.firstName} ${a.attendant.lastName} (${a.role})`);
      });
    }
  }
  
  // Verify data consistency
  console.log('\n🔍 DATA CONSISTENCY CHECK:');
  const positionsAttendantIds = new Set();
  positionsPageData.positions.forEach(position => {
    position.assignments.forEach(assignment => {
      if (assignment.attendant) {
        positionsAttendantIds.add(assignment.attendant.id);
      }
    });
  });
  
  const attendantsAttendantIds = new Set(attendantsPageAttendants.map(a => a.id));
  
  console.log(`Positions page unique attendants: ${positionsAttendantIds.size}`);
  console.log(`Attendants page unique attendants: ${attendantsAttendantIds.size}`);
  console.log(`Data consistency: ${positionsAttendantIds.size === attendantsAttendantIds.size ? '✅ MATCH' : '❌ MISMATCH'}`);
  
  await prisma.$disconnect();
}

verifyUnification().catch(console.error);
