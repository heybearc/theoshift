const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAssignments() {
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459'
  
  try {
    console.log('🧹 BULK CLEAR: Starting assignment cleanup...')
    
    // Check assignments table
    const assignments = await prisma.assignments.findMany({
      where: { eventId: eventId }
    })
    console.log(`📊 assignments table: ${assignments.length} records`)
    
    // Check position_assignments table
    const positionAssignments = await prisma.position_assignments.findMany({
      include: { position: true },
      where: { position: { eventId: eventId } }
    })
    console.log(`📊 position_assignments table: ${positionAssignments.length} records`)
    
    let totalDeleted = 0
    
    // Delete from assignments table
    if (assignments.length > 0) {
      const result1 = await prisma.assignments.deleteMany({
        where: { eventId: eventId }
      })
      console.log(`✅ Deleted ${result1.count} from assignments table`)
      totalDeleted += result1.count
    }
    
    // Delete from position_assignments table
    if (positionAssignments.length > 0) {
      const result2 = await prisma.position_assignments.deleteMany({
        where: { position: { eventId: eventId } }
      })
      console.log(`✅ Deleted ${result2.count} from position_assignments table`)
      totalDeleted += result2.count
    }
    
    console.log(`🎉 TOTAL DELETED: ${totalDeleted} assignments`)
    console.log('🎯 Event is now ready for testing oversight-aware auto-assignment!')
    
  } catch (error) {
    console.error('❌ Error clearing assignments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAssignments()
