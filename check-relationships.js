const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRelationships() {
  console.log('🔍 Checking attendant-assignment relationships...');
  
  // Get Station 2 assignments with attendant details
  const station2 = await prisma.positions.findFirst({
    where: { name: { contains: 'Station 2' } },
    include: {
      assignments: {
        include: {
          attendant: true,
          shift: true
        }
      }
    }
  });
  
  if (station2) {
    console.log('\nStation 2 assignments:');
    station2.assignments.forEach((assignment, i) => {
      console.log(`${i + 1}. Role: ${assignment.role}`);
      console.log(`   AttendantId: ${assignment.attendantId}`);
      console.log(`   Attendant: ${assignment.attendant ? assignment.attendant.firstName + ' ' + assignment.attendant.lastName : 'NULL'}`);
      console.log(`   ShiftId: ${assignment.shiftId || 'NULL'}`);
      console.log(`   Shift: ${assignment.shift ? assignment.shift.name : 'NULL'}`);
      console.log('');
    });
    
    // Check if attendant IDs exist in attendants table
    console.log('🔍 Checking if attendant IDs exist:');
    for (const assignment of station2.assignments) {
      const attendantExists = await prisma.attendants.findUnique({
        where: { id: assignment.attendantId },
        select: { id: true, firstName: true, lastName: true }
      });
      
      console.log(`AttendantId ${assignment.attendantId}: ${attendantExists ? 'EXISTS' : 'NOT FOUND'}`);
      if (attendantExists) {
        console.log(`  Name: ${attendantExists.firstName} ${attendantExists.lastName}`);
      }
    }
  } else {
    console.log('❌ Station 2 not found');
  }
  
  await prisma.$disconnect();
}

checkRelationships().catch(console.error);
