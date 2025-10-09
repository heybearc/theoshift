const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTableMismatch() {
  console.log('🔍 Debugging table system mismatch...');
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  // Check OLD system (event_attendant_associations) - what Attendants page uses
  console.log('\n📊 OLD SYSTEM (event_attendant_associations):');
  const oldSystemData = await prisma.event_attendant_associations.findMany({
    where: { eventId },
    include: {
      attendants: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
  
  console.log(`Count: ${oldSystemData.length}`);
  oldSystemData.slice(0, 5).forEach((assoc, i) => {
    console.log(`${i + 1}. ${assoc.attendants?.firstName || 'No name'} ${assoc.attendants?.lastName || ''} (Role: ${assoc.role})`);
  });
  
  // Check NEW system (position_assignments) - what Positions page uses
  console.log('\n📊 NEW SYSTEM (position_assignments):');
  const newSystemData = await prisma.position_assignments.findMany({
    where: {
      position: {
        eventId: eventId
      }
    },
    include: {
      attendant: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      position: {
        select: {
          name: true
        }
      }
    }
  });
  
  console.log(`Count: ${newSystemData.length}`);
  newSystemData.forEach((assignment, i) => {
    console.log(`${i + 1}. ${assignment.attendant?.firstName || 'No name'} ${assignment.attendant?.lastName || ''} (Role: ${assignment.role}) - Position: ${assignment.position?.name}`);
  });
  
  // Check if there are any common attendants
  console.log('\n🔍 ATTENDANT ID COMPARISON:');
  const oldAttendantIds = oldSystemData.map(a => a.attendants?.id).filter(Boolean);
  const newAttendantIds = newSystemData.map(a => a.attendant?.id).filter(Boolean);
  
  console.log('OLD system attendant IDs:', oldAttendantIds.slice(0, 5));
  console.log('NEW system attendant IDs:', newAttendantIds);
  
  const commonIds = oldAttendantIds.filter(id => newAttendantIds.includes(id));
  console.log(`Common attendant IDs: ${commonIds.length}`);
  
  await prisma.$disconnect();
}

debugTableMismatch().catch(console.error);
