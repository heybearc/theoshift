const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugStation2() {
  console.log('🔍 Debugging Station 2 assignment issue...');
  
  // Find Station 2
  const station2 = await prisma.positions.findFirst({
    where: { 
      name: { contains: 'Station 2' }
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
  
  if (!station2) {
    console.log('❌ Station 2 not found');
    return;
  }
  
  console.log(`\n🏢 ${station2.name}:`);
  console.log(`  - Position ID: ${station2.id}`);
  console.log(`  - Active: ${station2.isActive}`);
  console.log(`  - Shifts: ${station2.shifts?.length || 0}`);
  console.log(`  - Total Assignments: ${station2.assignments?.length || 0}`);
  
  if (station2.shifts && station2.shifts.length > 0) {
    console.log('\n📅 Shifts:');
    station2.shifts.forEach(shift => {
      console.log({
        id: shift.id,
        name: shift.name,
        isAllDay: shift.isAllDay,
        startTime: shift.startTime,
        endTime: shift.endTime
      });
    });
  }
  
  if (station2.assignments && station2.assignments.length > 0) {
    console.log('\n👥 Assignments:');
    station2.assignments.forEach(assignment => {
      console.log({
        id: assignment.id,
        attendantName: assignment.attendant ? `${assignment.attendant.firstName} ${assignment.attendant.lastName}` : 'No attendant',
        role: assignment.role,
        shiftId: assignment.shiftId,
        shiftName: assignment.shift?.name || 'No shift',
        hasShift: !!assignment.shift
      });
    });
    
    // Check shift-specific assignments
    if (station2.shifts && station2.shifts.length > 0) {
      console.log('\n🔍 Shift-specific analysis:');
      station2.shifts.forEach(shift => {
        const shiftAssignments = station2.assignments.filter(a => a.shiftId === shift.id);
        const attendantAssignments = shiftAssignments.filter(a => a.role === 'ATTENDANT');
        console.log({
          shiftName: shift.name,
          shiftId: shift.id,
          totalAssignments: shiftAssignments.length,
          attendantAssignments: attendantAssignments.length,
          attendants: attendantAssignments.map(a => a.attendant ? `${a.attendant.firstName} ${a.attendant.lastName}` : 'Unknown')
        });
      });
    }
  } else {
    console.log('\n❌ No assignments found');
  }
  
  await prisma.$disconnect();
}

debugStation2().catch(console.error);
