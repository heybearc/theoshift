const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAssignments() {
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459'
  
  try {
    console.log('🧹 BULK CLEAR: Starting assignment cleanup...')
    
    // Get count of assignments to delete
    const assignments = await prisma.assignments.findMany({
      where: { eventId: eventId }
    })
    
    console.log(`🧹 Found ${assignments.length} assignments to delete`)
    
    // Delete all assignments for this event
    const deleteResult = await prisma.assignments.deleteMany({
      where: { eventId: eventId }
    })
    
    console.log(`✅ BULK CLEAR: Successfully deleted ${deleteResult.count} assignments`)
    console.log('🎯 Event is now ready for testing oversight-aware auto-assignment!')
    
  } catch (error) {
    console.error('❌ Error clearing assignments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAssignments()
