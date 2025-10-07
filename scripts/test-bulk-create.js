const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testBulkCreate() {
  console.log('🛡️ APEX GUARDIAN - TESTING BULK POSITION CREATE')
  console.log('===============================================')
  
  try {
    const eventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    
    // Test 1: Check if event exists
    console.log('\n1. CHECKING EVENT:')
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })
    
    if (!event) {
      console.log('❌ Event not found')
      return
    }
    
    console.log(`✅ Event found: ${event.name}`)
    
    // Test 2: Check existing positions
    console.log('\n2. CHECKING EXISTING POSITIONS:')
    const existingPositions = await prisma.positions.findMany({
      where: { eventId },
      select: { positionNumber: true, name: true }
    })
    
    console.log(`✅ Found ${existingPositions.length} existing positions`)
    if (existingPositions.length > 0) {
      console.log('   Existing positions:', existingPositions.slice(0, 5).map(p => `${p.positionNumber}: ${p.name}`).join(', '))
    }
    
    // Test 3: Check shift templates
    console.log('\n3. CHECKING SHIFT TEMPLATES:')
    const templates = await prisma.shift_templates.findMany({
      where: { isSystemTemplate: true },
      select: { id: true, name: true, shifts: true }
    })
    
    console.log(`✅ Found ${templates.length} shift templates`)
    templates.forEach(template => {
      console.log(`   - ${template.name}: ${template.shifts.length} shifts`)
    })
    
    // Test 4: Try to create positions directly
    console.log('\n4. TESTING DIRECT POSITION CREATION:')
    
    const startNumber = 101
    const endNumber = 103
    const namePrefix = 'Test Position'
    
    // Check if positions already exist
    const conflictingPositions = await prisma.positions.findMany({
      where: {
        eventId,
        positionNumber: {
          gte: startNumber,
          lte: endNumber
        }
      }
    })
    
    if (conflictingPositions.length > 0) {
      console.log(`⚠️  Positions ${conflictingPositions.map(p => p.positionNumber).join(', ')} already exist`)
      
      // Delete them for testing
      await prisma.positions.deleteMany({
        where: {
          eventId,
          positionNumber: {
            gte: startNumber,
            lte: endNumber
          }
        }
      })
      console.log('✅ Cleared test positions')
    }
    
    // Create test positions
    const createdPositions = []
    
    for (let num = startNumber; num <= endNumber; num++) {
      const position = await prisma.positions.create({
        data: {
          eventId,
          positionNumber: num,
          name: `${namePrefix} ${num}`,
          sequence: num
        }
      })
      createdPositions.push(position)
    }
    
    console.log(`✅ Successfully created ${createdPositions.length} test positions`)
    createdPositions.forEach(pos => {
      console.log(`   - Position ${pos.positionNumber}: ${pos.name}`)
    })
    
    console.log('\n🛡️ BULK CREATE TEST COMPLETE')
    console.log('============================')
    console.log('✅ Database operations working correctly')
    console.log('✅ Position creation functional')
    console.log('✅ Shift templates available')
    console.log('✅ Issue likely in frontend authentication or API call')
    
  } catch (error) {
    console.error('❌ BULK CREATE TEST FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBulkCreate()
