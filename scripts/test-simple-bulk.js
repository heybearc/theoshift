const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testSimpleBulk() {
  console.log('🛡️ APEX GUARDIAN - TESTING SIMPLE BULK CREATE')
  console.log('==============================================')
  
  try {
    const eventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    
    // Clear any existing test positions
    console.log('\n1. CLEARING EXISTING TEST POSITIONS:')
    await prisma.positions.deleteMany({
      where: {
        eventId,
        positionNumber: {
          gte: 1,
          lte: 3
        }
      }
    })
    console.log('✅ Cleared positions 1-3')
    
    // Test simple bulk create
    console.log('\n2. TESTING BULK CREATE:')
    const startNumber = 1
    const endNumber = 3
    const namePrefix = 'Test'
    
    const createdPositions = []
    
    for (let num = startNumber; num <= endNumber; num++) {
      const position = await prisma.positions.create({
        data: {
          eventId,
          positionNumber: num,
          name: `${namePrefix} ${num}`,
          sequence: num,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      createdPositions.push(position)
      console.log(`✅ Created: ${position.name}`)
    }
    
    console.log(`\n✅ Successfully created ${createdPositions.length} positions`)
    
    // Test with shift templates
    console.log('\n3. TESTING SHIFT TEMPLATES:')
    const templates = await prisma.shift_templates.findMany({
      where: { isSystemTemplate: true },
      take: 1
    })
    
    if (templates.length > 0) {
      console.log(`✅ Found shift template: ${templates[0].name}`)
      
      // Create a position with shifts
      const positionWithShifts = await prisma.positions.create({
        data: {
          eventId,
          positionNumber: 99,
          name: 'Test Position with Shifts',
          sequence: 99,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      // Add shifts
      const shifts = templates[0].shifts
      for (let i = 0; i < shifts.length; i++) {
        const shift = shifts[i]
        await prisma.position_shifts.create({
          data: {
            positionId: positionWithShifts.id,
            name: shift.name,
            startTime: shift.startTime || null,
            endTime: shift.endTime || null,
            isAllDay: shift.isAllDay || false,
            sequence: i + 1,
            createdAt: new Date()
          }
        })
      }
      
      console.log(`✅ Created position with ${shifts.length} shifts`)
    } else {
      console.log('⚠️  No shift templates found')
    }
    
    console.log('\n🛡️ SIMPLE BULK CREATE TEST COMPLETE')
    console.log('===================================')
    console.log('✅ All database operations successful')
    console.log('✅ Bulk create logic works correctly')
    console.log('💡 Issue likely in API validation or request handling')
    
  } catch (error) {
    console.error('❌ SIMPLE BULK CREATE FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSimpleBulk()
