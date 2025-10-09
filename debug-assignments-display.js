const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAssignmentDisplay() {
  console.log('🔍 Debugging assignment display issues...');
  
  // Check stations 2-19 assignments
  const positions = await prisma.positions.findMany({
    where: { 
      name: { 
        in: ['Station 2', 'Station 16 - Back Stage Left', 'Station 19'] 
      } 
    },
    include: {
      assignments: {
        include: {
          attendant: true,
          shift: true
        }
      },
      shifts: true
    }
  });
  
  console.log(`\n📋 Found ${positions.length} positions to check:`);
  
  positions.forEach(position => {
    console.log(`\n🏢 ${position.name}:`);
    console.log(`  - Shifts: ${position.shifts?.length || 0}`);
    console.log(`  - Total Assignments: ${position.assignments?.length || 0}`);
    
    if (position.assignments && position.assignments.length > 0) {
      console.log('  - Assignment Details:');
      position.assignments.forEach(assignment => {
        console.log({
          attendant: assignment.attendant ? `${assignment.attendant.firstName} ${assignment.attendant.lastName}` : 'No attendant',
          role: assignment.role,
          shiftId: assignment.shiftId,
          shiftName: assignment.shift?.name || 'No shift',
          assignmentId: assignment.id
        });
      });
    }
    
    if (position.shifts && position.shifts.length > 0) {
      console.log('  - Shift Details:');
      position.shifts.forEach(shift => {
        const shiftAssignments = position.assignments?.filter(a => a.shiftId === shift.id) || [];
        console.log({
          shiftName: shift.name,
          shiftId: shift.id,
          assignmentsForThisShift: shiftAssignments.length,
          attendantsInShift: shiftAssignments.filter(a => a.role === 'ATTENDANT').length,
          leadershipInShift: shiftAssignments.filter(a => a.role !== 'ATTENDANT').length
        });
      });
    }
  });
  
  await prisma.$disconnect();
}

debugAssignmentDisplay().catch(console.error);
