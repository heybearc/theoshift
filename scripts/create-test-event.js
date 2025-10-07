const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestEvent() {
  console.log('🛡️ APEX GUARDIAN - CREATING TEST EVENT')
  console.log('====================================')
  
  try {
    const eventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    
    // Check if event already exists
    const existingEvent = await prisma.events.findUnique({
      where: { id: eventId }
    })
    
    if (existingEvent) {
      console.log(`✅ Event already exists: ${existingEvent.name}`)
      return existingEvent
    }
    
    // Create test event
    const event = await prisma.events.create({
      data: {
        id: eventId,
        name: 'Test Event 123',
        eventType: 'CIRCUIT_ASSEMBLY',
        startDate: new Date('2024-12-01T09:00:00Z'),
        endDate: new Date('2024-12-01T16:00:00Z'),
        status: 'CURRENT',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Created test event: ${event.name}`)
    console.log(`   ID: ${event.id}`)
    console.log(`   Type: ${event.eventType}`)
    console.log(`   Status: ${event.status}`)
    
    return event
    
  } catch (error) {
    console.error('❌ CREATE EVENT FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestEvent()
