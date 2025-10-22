const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugApiResponse() {
  console.log('🔍 Debugging API response structure...');
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  // Simulate the exact API call the frontend makes
  const positions = await prisma.positions.findMany({
    where: { 
      eventId,
      isActive: true
    },
    orderBy: [
      { sequence: 'asc' },
      { positionNumber: 'asc' }
    ],
    include: {
      shifts: {
        orderBy: { sequence: 'asc' }
      },
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
      }
    }
  });
  
  console.log(`\n📊 API Response: ${positions.length} positions`);
  
  // Focus on Station 2 and 3
  const station2 = positions.find(p => p.name.includes('Station 2'));
  const station3 = positions.find(p => p.name.includes('Station 3'));
  
  if (station2) {
    console.log(`\n🏢 Station 2 API Data Structure:`);
    console.log(`Name: ${station2.name}`);
    console.log(`Assignments array length: ${station2.assignments?.length || 0}`);
    console.log(`Shifts array length: ${station2.shifts?.length || 0}`);
    
    console.log('\nAssignments details:');
    station2.assignments?.forEach((assignment, index) => {
      console.log(`  [${index}] Role: ${assignment.role}`);
      console.log(`      Attendant: ${assignment.attendant ? `${assignment.attendant.firstName} ${assignment.attendant.lastName}` : 'null'}`);
      console.log(`      Shift: ${assignment.shift ? assignment.shift.name : 'null'}`);
      console.log(`      ShiftId: ${assignment.shiftId || 'null'}`);
      console.log(`      Has shift object: ${!!assignment.shift}`);
    });
    
    console.log('\nShifts details:');
    station2.shifts?.forEach((shift, index) => {
      console.log(`  [${index}] ${shift.name} (ID: ${shift.id})`);
    });
    
    // Test the frontend filtering logic
    console.log('\n🧪 Testing Frontend Logic:');
    if (station2.shifts && station2.shifts.length > 0) {
      station2.shifts.forEach(shift => {
        console.log(`\nShift: ${shift.name}`);
        
        // This is the exact logic from the frontend
        const shiftSpecificAssignments = station2.assignments?.filter(assignment => 
          assignment.shift?.id === shift.id
        ) || [];
        
        const attendantAssignments = shiftSpecificAssignments.filter(assignment => 
          assignment.role === 'ATTENDANT'
        );
        
        const shiftLeadershipAssignments = shiftSpecificAssignments.filter(assignment => 
          assignment.role === 'OVERSEER' || assignment.role === 'KEYMAN'
        );
        
        console.log(`  - Shift-specific assignments: ${shiftSpecificAssignments.length}`);
        console.log(`  - Attendant assignments: ${attendantAssignments.length}`);
        console.log(`  - Leadership assignments: ${shiftLeadershipAssignments.length}`);
        
        if (attendantAssignments.length > 0) {
          console.log(`  - Attendants found:`, attendantAssignments.map(a => 
            a.attendant ? `${a.attendant.firstName} ${a.attendant.lastName}` : 'No attendant'
          ));
        }
        
        if (shiftLeadershipAssignments.length > 0) {
          console.log(`  - Leadership found:`, shiftLeadershipAssignments.map(a => 
            `${a.attendant ? `${a.attendant.firstName} ${a.attendant.lastName}` : 'No attendant'} (${a.role})`
          ));
        }
      });
    }
  }
  
  await prisma.$disconnect();
}

debugApiResponse().catch(console.error);
