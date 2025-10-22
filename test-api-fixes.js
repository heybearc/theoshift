const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIFixes() {
  console.log('🔍 Testing API fixes for attendant operations...');
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  // Find an attendant from the NEW system that should be editable
  console.log('\n📊 Finding attendants from NEW system (position_assignments):');
  
  const attendantsFromNewSystem = await prisma.attendants.findMany({
    where: {
      position_assignments: {
        some: {
          position: {
            eventId: eventId
          }
        }
      }
    },
    include: {
      position_assignments: {
        where: {
          position: {
            eventId: eventId
          }
        },
        include: {
          position: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });
  
  console.log(`Found ${attendantsFromNewSystem.length} attendants in NEW system:`);
  attendantsFromNewSystem.forEach((attendant, i) => {
    console.log(`${i + 1}. ${attendant.firstName} ${attendant.lastName} (ID: ${attendant.id})`);
    console.log(`   Email: ${attendant.email}`);
    console.log(`   Assignments: ${attendant.position_assignments.length}`);
    attendant.position_assignments.forEach(assignment => {
      console.log(`     - ${assignment.role} at ${assignment.position.name}`);
    });
  });
  
  // Test if the API would find these attendants
  console.log('\n🧪 Testing API validation logic:');
  
  for (const attendant of attendantsFromNewSystem.slice(0, 3)) { // Test first 3
    console.log(`\nTesting attendant: ${attendant.firstName} ${attendant.lastName}`);
    
    // Simulate the API check that was failing
    const positionAssignment = await prisma.position_assignments.findFirst({
      where: {
        attendantId: attendant.id,
        position: {
          eventId: eventId
        }
      }
    });
    
    if (positionAssignment) {
      console.log(`  ✅ API would find this attendant (assignment ID: ${positionAssignment.id})`);
    } else {
      console.log(`  ❌ API would NOT find this attendant`);
    }
  }
  
  // Check if Willie Adams (from the error) exists in either system
  console.log('\n🔍 Checking for Willie Adams (from the error):');
  
  const willieInAttendants = await prisma.attendants.findFirst({
    where: {
      firstName: { contains: 'Willie', mode: 'insensitive' },
      lastName: { contains: 'Adams', mode: 'insensitive' }
    }
  });
  
  if (willieInAttendants) {
    console.log(`Found Willie Adams in attendants table: ${willieInAttendants.id}`);
    
    // Check if Willie has position assignments (NEW system)
    const willieNewSystem = await prisma.position_assignments.findFirst({
      where: {
        attendantId: willieInAttendants.id,
        position: {
          eventId: eventId
        }
      }
    });
    
    // Check if Willie has old associations (OLD system)
    const willieOldSystem = await prisma.event_attendant_associations.findFirst({
      where: {
        eventId: eventId,
        attendantId: willieInAttendants.id
      }
    });
    
    console.log(`  NEW system (position_assignments): ${willieNewSystem ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  OLD system (event_attendant_associations): ${willieOldSystem ? 'FOUND' : 'NOT FOUND'}`);
    
    if (willieNewSystem) {
      console.log(`  ✅ Willie should be editable with NEW API`);
    } else if (willieOldSystem) {
      console.log(`  ❌ Willie only in OLD system - would cause 404 with NEW API`);
    } else {
      console.log(`  ❌ Willie not associated with this event in either system`);
    }
  } else {
    console.log('Willie Adams not found in attendants table');
  }
  
  await prisma.$disconnect();
}

testAPIFixes().catch(console.error);
