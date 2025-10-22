const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFrontendTransform() {
  console.log('🔍 Testing exact frontend data transformation...');
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  // This is the EXACT query from getServerSideProps
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
  
  // Find Station 2
  const station2Raw = eventData?.positions?.find(p => p.name.includes('Station 2'));
  
  if (station2Raw) {
    console.log('\n🏢 Station 2 RAW data from database:');
    console.log('Assignments count:', station2Raw.assignments?.length || 0);
    console.log('Shifts count:', station2Raw.shifts?.length || 0);
    
    // Apply the EXACT transformation from getServerSideProps
    const station2Transformed = {
      id: station2Raw.id,
      positionNumber: station2Raw.positionNumber,
      name: station2Raw.name,
      description: station2Raw.description,
      area: station2Raw.area || null,
      sequence: station2Raw.sequence || station2Raw.positionNumber,
      isActive: station2Raw.isActive,
      assignments: station2Raw.assignments.map(assignment => ({
        id: assignment.id,
        role: assignment.role || 'ATTENDANT',
        attendant: assignment.attendant ? {
          id: assignment.attendant.id,
          firstName: assignment.attendant.firstName,
          lastName: assignment.attendant.lastName
        } : null,
        overseer: assignment.overseer ? {
          id: assignment.overseer.id,
          firstName: assignment.overseer.firstName,
          lastName: assignment.overseer.lastName
        } : null,
        keyman: assignment.keyman ? {
          id: assignment.keyman.id,
          firstName: assignment.keyman.firstName,
          lastName: assignment.keyman.lastName
        } : null,
        shift: assignment.shift ? {
          id: assignment.shift.id,
          name: assignment.shift.name,
          startTime: assignment.shift.startTime,
          endTime: assignment.shift.endTime,
          isAllDay: assignment.shift.isAllDay
        } : null
      })).filter(assignment => assignment.attendant !== null),
      shifts: station2Raw.shifts || []
    };
    
    console.log('\n🔄 Station 2 TRANSFORMED data (what frontend receives):');
    console.log('Assignments count after filter:', station2Transformed.assignments?.length || 0);
    console.log('Shifts count:', station2Transformed.shifts?.length || 0);
    
    console.log('\nTransformed assignments:');
    station2Transformed.assignments?.forEach((assignment, i) => {
      console.log(`${i + 1}. Role: ${assignment.role}`);
      console.log(`   Attendant: ${assignment.attendant ? assignment.attendant.firstName + ' ' + assignment.attendant.lastName : 'null'}`);
      console.log(`   Shift: ${assignment.shift ? assignment.shift.name : 'null'}`);
      console.log(`   Has shift object: ${!!assignment.shift}`);
    });
    
    // Test the frontend filtering logic
    if (station2Transformed.shifts && station2Transformed.shifts.length > 0) {
      const shift = station2Transformed.shifts[0];
      console.log(`\n🧪 Testing frontend filtering for shift: ${shift.name}`);
      
      const shiftSpecificAssignments = station2Transformed.assignments?.filter(assignment => 
        assignment.shift?.id === shift.id
      ) || [];
      
      const attendantAssignments = shiftSpecificAssignments.filter(assignment => 
        assignment.role === 'ATTENDANT'
      );
      
      console.log(`Shift ID to match: ${shift.id}`);
      console.log(`Shift-specific assignments found: ${shiftSpecificAssignments.length}`);
      console.log(`Attendant assignments found: ${attendantAssignments.length}`);
      
      if (attendantAssignments.length > 0) {
        console.log('✅ ATTENDANTS SHOULD BE VISIBLE:');
        attendantAssignments.forEach(a => {
          console.log(`  - ${a.attendant.firstName} ${a.attendant.lastName}`);
        });
      } else {
        console.log('❌ NO ATTENDANTS FOUND - DEBUGGING FILTER:');
        station2Transformed.assignments?.forEach(assignment => {
          console.log(`Assignment shift ID: ${assignment.shift?.id || 'null'}`);
          console.log(`Matches shift ID: ${assignment.shift?.id === shift.id}`);
          console.log(`Role: ${assignment.role}`);
          console.log('---');
        });
      }
    }
  }
  
  await prisma.$disconnect();
}

debugFrontendTransform().catch(console.error);
