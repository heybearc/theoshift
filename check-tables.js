const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  console.log('🔍 Checking which tables have data...');
  
  try {
    // Check OLD system
    const oldPositions = await prisma.event_positions.count();
    const oldAssignments = await prisma.assignments.count();
    
    // Check NEW system  
    const newPositions = await prisma.positions.count();
    const newAssignments = await prisma.position_assignments.count();
    
    // Check attendants
    const attendants = await prisma.attendants.count();
    const eventAttendantAssoc = await prisma.event_attendant_associations.count();
    
    console.log('\n📊 Table Counts:');
    console.log('OLD SYSTEM:');
    console.log('  event_positions:', oldPositions);
    console.log('  assignments:', oldAssignments);
    console.log('\nNEW SYSTEM:');
    console.log('  positions:', newPositions);
    console.log('  position_assignments:', newAssignments);
    console.log('\nATTENDANTS:');
    console.log('  attendants:', attendants);
    console.log('  event_attendant_associations:', eventAttendantAssoc);
    
    // Check which system has the Station 2 data
    console.log('\n🔍 Station 2 Data Location:');
    
    const oldStation2 = await prisma.event_positions.findFirst({
      where: { positionName: { contains: 'Station 2' } }
    });
    
    const newStation2 = await prisma.positions.findFirst({
      where: { name: { contains: 'Station 2' } }
    });
    
    console.log('OLD system Station 2:', oldStation2 ? 'FOUND' : 'NOT FOUND');
    console.log('NEW system Station 2:', newStation2 ? 'FOUND' : 'NOT FOUND');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await prisma.$disconnect();
}

checkTables().catch(console.error);
