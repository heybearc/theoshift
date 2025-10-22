const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOversightIssue() {
  try {
    console.log('🔍 Checking database integrity for oversight API...');
    
    // Check attendants count
    const attendantCount = await prisma.attendants.count({ where: { isActive: true } });
    console.log('✅ Active attendants:', attendantCount);
    
    // Check event_attendant_associations count
    const associationCount = await prisma.event_attendant_associations.count();
    console.log('✅ Event-attendant associations:', associationCount);
    
    // Check the specific attendant that was failing
    const attendantId = '6de2d97f-e9ea-480f-8670-c61ccd60721f';
    const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
    
    const attendant = await prisma.attendants.findFirst({
      where: { id: attendantId }
    });
    console.log('✅ Specific attendant exists:', !!attendant);
    if (attendant) {
      console.log('   - Name:', attendant.firstName, attendant.lastName);
      console.log('   - Active:', attendant.isActive);
    }
    
    // Check if association exists for this attendant
    const association = await prisma.event_attendant_associations.findFirst({
      where: { 
        attendantId: attendantId,
        eventId: eventId
      }
    });
    console.log('✅ Association exists:', !!association);
    if (association) {
      console.log('   - Association ID:', association.id);
      console.log('   - Current overseerId:', association.overseerId);
      console.log('   - Current keymanId:', association.keymanId);
    }
    
    // Check if the overseer ID we're trying to assign exists
    const overseerId = '766bdddd-b01a-41c7-94ce-fa5f48866d58';
    const overseer = await prisma.attendants.findFirst({
      where: { id: overseerId }
    });
    console.log('✅ Overseer exists:', !!overseer);
    if (overseer) {
      console.log('   - Overseer name:', overseer.firstName, overseer.lastName);
    }
    
    // Test the exact query our API would run
    console.log('\n🔧 Testing API logic...');
    
    if (!attendant) {
      console.log('❌ Attendant not found - this would cause 404');
      return;
    }
    
    if (association) {
      console.log('✅ Association exists - would update');
      // Test update
      const testUpdate = await prisma.event_attendant_associations.update({
        where: { id: association.id },
        data: { overseerId: overseerId },
        include: {
          overseer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });
      console.log('✅ Update successful:', testUpdate.overseer?.firstName, testUpdate.overseer?.lastName);
    } else {
      console.log('⚠️  No association - would create new one');
      // Test create
      const testCreate = await prisma.event_attendant_associations.create({
        data: {
          id: require('crypto').randomUUID(),
          eventId: eventId,
          attendantId: attendantId,
          overseerId: overseerId
        }
      });
      console.log('✅ Create successful:', testCreate.id);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOversightIssue();
