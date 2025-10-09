const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUrlFix() {
  console.log('🔍 Creating URL fix for event access...');
  
  // Get the actual event
  const event = await prisma.events.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true
    }
  });
  
  if (event) {
    console.log(`\n✅ Found active event:`);
    console.log(`   Name: ${event.name}`);
    console.log(`   ID: ${event.id}`);
    console.log(`\n🎯 CORRECT URL TO USE:`);
    console.log(`   https://jw-staging.cloudigan.net/events/${event.id}/positions`);
    console.log(`\n❌ WRONG URL (probably what you're using):`);
    console.log(`   https://jw-staging.cloudigan.net/events/1/positions`);
    
    // Test the positions query with correct event ID
    const positions = await prisma.positions.findMany({
      where: { 
        eventId: event.id,
        isActive: true
      },
      include: {
        assignments: {
          include: {
            attendant: true,
            shift: true
          }
        },
        shifts: true
      },
      orderBy: { positionNumber: 'asc' }
    });
    
    console.log(`\n📊 With correct event ID, found ${positions.length} positions`);
    
    // Show first few positions with assignments
    positions.slice(0, 3).forEach(pos => {
      const attendantCount = pos.assignments?.filter(a => a.role === 'ATTENDANT').length || 0;
      const oversightCount = pos.assignments?.filter(a => a.role === 'OVERSEER' || a.role === 'KEYMAN').length || 0;
      console.log(`   - ${pos.name}: ${attendantCount} attendants, ${oversightCount} oversight`);
    });
  }
  
  await prisma.$disconnect();
}

debugUrlFix().catch(console.error);
