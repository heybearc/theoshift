const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignKeymanDemo() {
  console.log('🛡️ APEX GUARDIAN - Keyman Assignment Demo');
  console.log('=' .repeat(60));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // Find Station 15
    const station15 = await prisma.positions.findFirst({
      where: {
        eventId,
        name: { contains: '15' }
      }
    });
    
    if (!station15) {
      console.log('❌ Station 15 not found');
      return;
    }
    
    console.log(`✅ Found Station 15: ${station15.name}`);
    
    // Find available keymen
    const availableKeymen = await prisma.attendants.findMany({
      where: {
        isActive: true,
        formsOfService: {
          array_contains: 'Keyman'
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        formsOfService: true
      }
    });
    
    console.log(`\n👥 Available Keymen (${availableKeymen.length}):`);
    availableKeymen.forEach((attendant, i) => {
      console.log(`${i + 1}. ${attendant.firstName} ${attendant.lastName} - ${attendant.formsOfService.join(', ')}`);
    });
    
    if (availableKeymen.length === 0) {
      console.log('❌ No available keymen found');
      return;
    }
    
    // Assign first available keyman to Station 15
    const keymanToAssign = availableKeymen[0];
    console.log(`\n🎯 Assigning ${keymanToAssign.firstName} ${keymanToAssign.lastName} as KEYMAN to Station 15`);
    
    // Get the All Day shift for Station 15
    const allDayShift = await prisma.position_shifts.findFirst({
      where: {
        positionId: station15.id,
        name: 'All Day'
      }
    });
    
    if (!allDayShift) {
      console.log('❌ All Day shift not found for Station 15');
      return;
    }
    
    // Create keyman assignment
    const keymanAssignment = await prisma.position_assignments.create({
      data: {
        id: require('crypto').randomUUID(),
        positionId: station15.id,
        attendantId: keymanToAssign.id,
        shiftId: allDayShift.id,
        role: 'KEYMAN',
        keymanId: keymanToAssign.id // Reference to the keyman
      }
    });
    
    console.log(`✅ Created keyman assignment: ${keymanAssignment.id}`);
    
    // Verify the assignment
    const updatedStation15 = await prisma.positions.findFirst({
      where: { id: station15.id },
      include: {
        assignments: {
          include: {
            attendant: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            keyman: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            overseer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    console.log(`\n✅ UPDATED STATION 15 ASSIGNMENTS:`);
    updatedStation15.assignments.forEach((assignment, i) => {
      console.log(`${i + 1}. ${assignment.attendant?.firstName} ${assignment.attendant?.lastName} - ${assignment.role}`);
      if (assignment.role === 'KEYMAN' && assignment.keyman) {
        console.log(`   🟣 Keyman: ${assignment.keyman.firstName} ${assignment.keyman.lastName}`);
      }
      if (assignment.role === 'OVERSEER' && assignment.overseer) {
        console.log(`   🔵 Overseer: ${assignment.overseer.firstName} ${assignment.overseer.lastName}`);
      }
    });
    
    const overseers = updatedStation15.assignments.filter(a => a.role === 'OVERSEER');
    const keymen = updatedStation15.assignments.filter(a => a.role === 'KEYMAN');
    
    console.log(`\n📊 FINAL OVERSIGHT STRUCTURE:`);
    console.log(`Overseers: ${overseers.length}`);
    console.log(`Keymen: ${keymen.length}`);
    console.log(`✅ Station 15 now has both overseer and keyman!`);
    
  } catch (error) {
    console.error('❌ Assignment error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignKeymanDemo();
