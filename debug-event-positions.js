const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugEventPositions() {
  console.log('🔍 Debugging event and positions...');
  
  // Check events
  const events = await prisma.events.findMany({
    select: {
      id: true,
      name: true,
      isActive: true
    }
  });
  
  console.log(`\n📅 Found ${events.length} events:`);
  events.forEach(event => {
    console.log(`  - ${event.name} (ID: ${event.id}, Active: ${event.isActive})`);
  });
  
  // Check all positions regardless of event
  const allPositions = await prisma.positions.findMany({
    select: {
      id: true,
      name: true,
      eventId: true,
      isActive: true,
      positionNumber: true
    },
    orderBy: { positionNumber: 'asc' }
  });
  
  console.log(`\n🏢 Found ${allPositions.length} total positions:`);
  allPositions.slice(0, 10).forEach(pos => {
    console.log(`  - ${pos.name} (Event: ${pos.eventId}, Active: ${pos.isActive}, #${pos.positionNumber})`);
  });
  
  // Check positions for the first event
  if (events.length > 0) {
    const firstEventId = events[0].id;
    console.log(`\n🎯 Checking positions for event ${firstEventId}:`);
    
    const eventPositions = await prisma.positions.findMany({
      where: { 
        eventId: firstEventId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        positionNumber: true,
        isActive: true
      },
      orderBy: { positionNumber: 'asc' }
    });
    
    console.log(`  - Found ${eventPositions.length} active positions for event ${firstEventId}`);
    eventPositions.slice(0, 5).forEach(pos => {
      console.log(`    - ${pos.name} (#${pos.positionNumber})`);
    });
  }
  
  // Check if there are positions with eventId '1' as string
  const stringEventPositions = await prisma.positions.findMany({
    where: { 
      eventId: '1',
      isActive: true
    },
    select: {
      id: true,
      name: true,
      positionNumber: true
    }
  });
  
  console.log(`\n🔍 Positions with eventId '1' (string): ${stringEventPositions.length}`);
  
  await prisma.$disconnect();
}

debugEventPositions().catch(console.error);
