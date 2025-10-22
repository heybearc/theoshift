const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')

const prisma = new PrismaClient()

async function testBulkCreateLogic() {
  console.log('🔍 Testing Bulk Create Logic Directly...')
  
  try {
    const eventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    const startNumber = 1
    const endNumber = 3
    const namePrefix = 'Station'
    const area = 'Auditorium'
    
    console.log('\n1. Checking event exists:')
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })
    
    if (!event) {
      console.log('❌ Event not found')
      return
    }
    console.log(`✅ Event found: ${event.name}`)
    
    console.log('\n2. Checking for existing positions:')
    const existingPositions = await prisma.positions.findMany({
      where: {
        eventId,
        positionNumber: {
          gte: startNumber,
          lte: endNumber
        }
      },
      select: { positionNumber: true }
    })
    
    if (existingPositions.length > 0) {
      console.log(`⚠️  Existing positions found: ${existingPositions.map(p => p.positionNumber).join(', ')}`)
      // Clear them for testing
      await prisma.positions.deleteMany({
        where: {
          eventId,
          positionNumber: {
            gte: startNumber,
            lte: endNumber
          }
        }
      })
      console.log('✅ Cleared existing positions for testing')
    } else {
      console.log('✅ No existing positions found')
    }
    
    console.log('\n3. Testing shift template access:')
    const template = await prisma.shift_templates.findFirst({
      where: { name: 'All Day' }
    })
    
    if (template) {
      console.log(`✅ Found template: ${template.name} with ${template.shifts.length} shifts`)
    } else {
      console.log('⚠️  No All Day template found')
    }
    
    console.log('\n4. Testing bulk position creation:')
    const result = await prisma.$transaction(async (tx) => {
      const createdPositions = []
      
      for (let num = startNumber; num <= endNumber; num++) {
        console.log(`   Creating position ${num}...`)
        
        const position = await tx.positions.create({
          data: {
            id: randomUUID(),
            eventId,
            positionNumber: num,
            name: `${namePrefix} ${num}`,
            area,
            sequence: num,
            updatedAt: new Date()
          }
        })
        
        // Add shifts if template exists
        if (template && template.shifts) {
          for (let i = 0; i < template.shifts.length; i++) {
            const shift = template.shifts[i]
            await tx.position_shifts.create({
              data: {
                id: randomUUID(),
                positionId: position.id,
                name: shift.name,
                startTime: shift.startTime || null,
                endTime: shift.endTime || null,
                isAllDay: shift.isAllDay || false,
                sequence: i + 1
              }
            })
          }
        }
        
        createdPositions.push(position)
        console.log(`   ✅ Created: ${position.name}`)
      }
      
      return createdPositions
    })
    
    console.log(`\n🎉 SUCCESS: Created ${result.length} positions with shifts!`)
    
    // Verify they exist
    const verification = await prisma.positions.findMany({
      where: { eventId },
      include: {
        shifts: true
      }
    })
    
    console.log(`\n📋 Verification: Found ${verification.length} positions in database`)
    verification.forEach(p => {
      console.log(`   - ${p.name}: ${p.shifts.length} shifts`)
    })
    
  } catch (error) {
    console.error('❌ Bulk create logic error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBulkCreateLogic()
