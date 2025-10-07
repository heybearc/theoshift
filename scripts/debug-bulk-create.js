const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugBulkCreate() {
  console.log('🛡️ APEX GUARDIAN - DEBUGGING BULK CREATE VALIDATION')
  console.log('==================================================')
  
  try {
    const eventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    
    // Test 1: Check event exists
    console.log('\n1. CHECKING EVENT:')
    const event = await prisma.events.findUnique({
      where: { id: eventId }
    })
    
    if (!event) {
      console.log('❌ Event not found - this would cause 404')
      return
    }
    console.log(`✅ Event found: ${event.name}`)
    
    // Test 2: Check for existing positions that might conflict
    console.log('\n2. CHECKING FOR POSITION CONFLICTS:')
    const startNumber = 1
    const endNumber = 5
    
    const existingPositions = await prisma.positions.findMany({
      where: {
        eventId,
        positionNumber: {
          gte: startNumber,
          lte: endNumber
        }
      },
      select: { positionNumber: true, name: true }
    })
    
    if (existingPositions.length > 0) {
      console.log(`⚠️  Conflicting positions found: ${existingPositions.map(p => p.positionNumber).join(', ')}`)
      console.log('   This would cause 400 error: "Positions already exist"')
    } else {
      console.log('✅ No position conflicts found')
    }
    
    // Test 3: Test validation schema
    console.log('\n3. TESTING VALIDATION SCHEMA:')
    const testPayload = {
      startNumber: 1,
      endNumber: 5,
      namePrefix: 'Position',
      area: 'Main Hall'
    }
    
    console.log('   Test payload:', JSON.stringify(testPayload, null, 2))
    
    // Simulate validation
    if (testPayload.startNumber < 1 || testPayload.startNumber > 1000) {
      console.log('❌ startNumber validation would fail')
    } else {
      console.log('✅ startNumber validation passes')
    }
    
    if (testPayload.endNumber < 1 || testPayload.endNumber > 1000) {
      console.log('❌ endNumber validation would fail')
    } else {
      console.log('✅ endNumber validation passes')
    }
    
    if (testPayload.endNumber < testPayload.startNumber) {
      console.log('❌ endNumber < startNumber validation would fail')
    } else {
      console.log('✅ endNumber >= startNumber validation passes')
    }
    
    const positionCount = testPayload.endNumber - testPayload.startNumber + 1
    if (positionCount > 100) {
      console.log('❌ Position count > 100 validation would fail')
    } else {
      console.log(`✅ Position count (${positionCount}) validation passes`)
    }
    
    console.log('\n🛡️ BULK CREATE DEBUG COMPLETE')
    console.log('==============================')
    
    if (existingPositions.length > 0) {
      console.log('🔧 LIKELY ISSUE: Position number conflicts')
      console.log('💡 SOLUTION: Try different position numbers or delete existing positions')
    } else {
      console.log('✅ No obvious validation issues found')
      console.log('💡 Check browser network tab for actual 400 error message')
    }
    
  } catch (error) {
    console.error('❌ DEBUG FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugBulkCreate()
