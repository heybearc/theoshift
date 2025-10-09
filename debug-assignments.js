const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAssignments() {
  console.log('🔍 Checking assignments for Station 2...');
  
  const assignments = await prisma.position_assignments.findMany({
    where: { 
      position: { 
        name: { contains: 'Station 2' } 
      } 
    },
    include: { 
      position: true, 
      shift: true, 
      attendant: true 
    }
  });
  
  console.log(`Found ${assignments.length} assignments:`);
  assignments.forEach(a => {
    console.log({
      assignmentId: a.id,
      positionName: a.position?.name,
      shiftId: a.shiftId,
      shiftName: a.shift?.name,
      attendantName: a.attendant ? `${a.attendant.firstName} ${a.attendant.lastName}` : 'No attendant',
      role: a.role
    });
  });
  
  // Also check shifts for this position
  console.log('\n🕐 Checking shifts for Station 2...');
  const shifts = await prisma.position_shifts.findMany({
    where: {
      position: {
        name: { contains: 'Station 2' }
      }
    },
    include: {
      position: true,
      assignments: {
        include: {
          attendant: true
        }
      }
    }
  });
  
  console.log(`Found ${shifts.length} shifts:`);
  shifts.forEach(s => {
    console.log({
      shiftId: s.id,
      shiftName: s.name,
      positionName: s.position?.name,
      assignmentCount: s.assignments?.length || 0,
      assignments: s.assignments?.map(a => ({
        attendantName: `${a.attendant?.firstName} ${a.attendant?.lastName}`,
        role: a.role
      })) || []
    });
  });
  
  await prisma.$disconnect();
}

checkAssignments().catch(console.error);
