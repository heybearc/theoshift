const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupPositions() {
  try {
    console.log('🧹 Starting position cleanup...');
    
    // Get the event ID we're working with
    const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
    
    console.log(`🎯 Cleaning up positions for event: ${eventId}`);
    
    // First, get all positions for this event
    const positions = await prisma.positions.findMany({
      where: { eventId: eventId },
      select: { id: true, name: true, positionNumber: true }
    });
    
    console.log(`📊 Found ${positions.length} positions to clean up`);
    
    // Count current data
    const assignmentCount = await prisma.position_assignments.count({
      where: {
        position: {
          eventId: eventId
        }
      }
    });
    
    const shiftCount = await prisma.position_shifts.count({
      where: {
        position: {
          eventId: eventId
        }
      }
    });
    
    console.log(`📊 Current data: ${assignmentCount} assignments, ${shiftCount} shifts`);
    
    if (assignmentCount === 0 && shiftCount === 0) {
      console.log('✅ No cleanup needed - positions are already clean!');
      return;
    }
    
    // Perform cleanup in transaction
    await prisma.$transaction(async (tx) => {
      console.log('🗑️  Deleting position assignments...');
      const deletedAssignments = await tx.position_assignments.deleteMany({
        where: {
          position: {
            eventId: eventId
          }
        }
      });
      console.log(`✅ Deleted ${deletedAssignments.count} position assignments`);
      
      console.log('🗑️  Deleting position shifts...');
      const deletedShifts = await tx.position_shifts.deleteMany({
        where: {
          position: {
            eventId: eventId
          }
        }
      });
      console.log(`✅ Deleted ${deletedShifts.count} position shifts`);
    });
    
    console.log('🎉 Position cleanup completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • Positions preserved: ${positions.length}`);
    console.log(`   • Assignments removed: ${assignmentCount}`);
    console.log(`   • Shifts removed: ${shiftCount}`);
    console.log('');
    console.log('✅ Ready for fresh testing!');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupPositions();
