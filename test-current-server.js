const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCurrentData() {
  console.log('🔍 Testing current server data with shift relationships...');
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  // Test the exact query from getServerSideProps
  const eventData = await prisma.events.findUnique({
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
          shifts: true
        },
        orderBy: [
          { positionNumber: 'asc' }
        ]
      }
    }
  });
  
  const station2 = eventData?.positions?.find(p => p.name.includes('Station 2'));
  
  if (station2) {
    console.log('\n🏢 Station 2 Current Data:');
    console.log('Assignments:', station2.assignments?.length || 0);
    console.log('Shifts:', station2.shifts?.length || 0);
    
    station2.assignments?.forEach((assignment, i) => {
      console.log(`Assignment ${i + 1}:`);
      console.log(`  Role: ${assignment.role}`);
      console.log(`  Attendant: ${assignment.attendant ? assignment.attendant.firstName + ' ' + assignment.attendant.lastName : 'null'}`);
      console.log(`  Shift: ${assignment.shift ? assignment.shift.name : 'null'}`);
      console.log(`  ShiftId: ${assignment.shiftId || 'null'}`);
    });
    
    // Test the filtering logic
    if (station2.shifts && station2.shifts.length > 0) {
      const shift = station2.shifts[0];
      const shiftAssignments = station2.assignments?.filter(a => a.shift?.id === shift.id) || [];
      const attendants = shiftAssignments.filter(a => a.role === 'ATTENDANT');
      const oversight = shiftAssignments.filter(a => a.role === 'OVERSEER' || a.role === 'KEYMAN');
      
      console.log('\n🧪 Filtering Test:');
      console.log(`Shift: ${shift.name} (ID: ${shift.id})`);
      console.log(`Shift assignments found: ${shiftAssignments.length}`);
      console.log(`Attendants: ${attendants.length}`);
      console.log(`Oversight: ${oversight.length}`);
      
      if (attendants.length > 0) {
        console.log('Attendant names:', attendants.map(a => a.attendant ? a.attendant.firstName + ' ' + a.attendant.lastName : 'No name'));
      }
    }
  } else {
    console.log('❌ Station 2 not found');
  }
  
  await prisma.$disconnect();
}

testCurrentData().catch(console.error);
