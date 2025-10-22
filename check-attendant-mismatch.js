const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttendantMismatch() {
  console.log('🔍 Checking for attendant display vs API mismatch...');
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  // Get attendants that would be shown by the frontend (NEW system)
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
  
  // Extract unique attendants (same logic as frontend)
  const attendantMap = new Map();
  eventData.positions.forEach(position => {
    position.assignments.forEach(assignment => {
      if (assignment.attendant) {
        const attendantId = assignment.attendant.id;
        if (!attendantMap.has(attendantId)) {
          attendantMap.set(attendantId, {
            id: assignment.attendant.id,
            firstName: assignment.attendant.firstName,
            lastName: assignment.attendant.lastName,
            email: assignment.attendant.email
          });
        }
      }
    });
  });
  
  const frontendAttendants = Array.from(attendantMap.values());
  
  console.log(`\n📊 Frontend would show ${frontendAttendants.length} attendants:`);
  frontendAttendants.forEach((attendant, i) => {
    console.log(`${i + 1}. ${attendant.firstName} ${attendant.lastName} (${attendant.email})`);
  });
  
  // Check if Willie Adams would be shown by frontend
  const willieInFrontend = frontendAttendants.find(a => 
    a.firstName.toLowerCase().includes('willie') && a.lastName.toLowerCase().includes('adams')
  );
  
  console.log(`\n🔍 Willie Adams in frontend display: ${willieInFrontend ? 'YES' : 'NO'}`);
  
  if (!willieInFrontend) {
    console.log('✅ Willie Adams should NOT appear in the frontend with our fixes');
    console.log('✅ The 404 error should be resolved - Willie won\'t be shown to edit');
  } else {
    console.log('❌ Willie Adams would still appear in frontend - need further investigation');
  }
  
  // Double-check: Are there any attendants in OLD system that might leak through?
  const oldSystemAttendants = await prisma.event_attendant_associations.findMany({
    where: { eventId },
    include: {
      attendants: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
  
  console.log(`\n📊 OLD system has ${oldSystemAttendants.length} attendant associations`);
  
  // Check for any overlap that might cause confusion
  const oldAttendantIds = new Set(oldSystemAttendants.map(a => a.attendants?.id).filter(Boolean));
  const newAttendantIds = new Set(frontendAttendants.map(a => a.id));
  
  const overlap = [...oldAttendantIds].filter(id => newAttendantIds.has(id));
  console.log(`Attendants in both systems: ${overlap.length}`);
  
  const oldOnlyIds = [...oldAttendantIds].filter(id => !newAttendantIds.has(id));
  console.log(`Attendants ONLY in OLD system: ${oldOnlyIds.length}`);
  
  if (oldOnlyIds.length > 0) {
    console.log('\n❌ OLD-only attendants that could cause 404s:');
    for (const id of oldOnlyIds.slice(0, 5)) { // Show first 5
      const attendant = await prisma.attendants.findUnique({
        where: { id },
        select: { firstName: true, lastName: true }
      });
      if (attendant) {
        console.log(`  - ${attendant.firstName} ${attendant.lastName} (ID: ${id})`);
      }
    }
  }
  
  await prisma.$disconnect();
}

checkAttendantMismatch().catch(console.error);
