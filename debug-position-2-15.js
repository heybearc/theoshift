const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugPosition215() {
  console.log('🔍 DEBUG: Position 2-15 Oversight Display');
  console.log('=' .repeat(60));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // Find position 2-15 (could be "Station 15" or "Position 15" or similar)
    const positions = await prisma.positions.findMany({
      where: {
        eventId,
        name: { contains: '15' }
      },
      include: {
        assignments: {
          include: {
            attendant: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            overseer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            keyman: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            shift: {
              select: {
                id: true,
                name: true,
                startTime: true,
                endTime: true
              }
            }
          }
        },
        shifts: true
      }
    });
    
    console.log(`Found ${positions.length} positions matching "15"`);
    
    positions.forEach((position, index) => {
      console.log(`\n📍 Position ${index + 1}: ${position.name}`);
      console.log(`   ID: ${position.id}`);
      console.log(`   Active: ${position.isActive}`);
      console.log(`   Assignments: ${position.assignments.length}`);
      
      if (position.assignments.length > 0) {
        console.log('\n   📋 ASSIGNMENTS:');
        position.assignments.forEach((assignment, i) => {
          console.log(`   ${i + 1}. ${assignment.attendant?.firstName} ${assignment.attendant?.lastName}`);
          console.log(`      Role: ${assignment.role}`);
          console.log(`      Shift: ${assignment.shift?.name || 'No shift'}`);
          
          if (assignment.role === 'OVERSEER' && assignment.overseer) {
            console.log(`      🔵 Overseer: ${assignment.overseer.firstName} ${assignment.overseer.lastName}`);
          }
          
          if (assignment.role === 'KEYMAN' && assignment.keyman) {
            console.log(`      🟣 Keyman: ${assignment.keyman.firstName} ${assignment.keyman.lastName}`);
          }
          
          console.log(`      Assignment ID: ${assignment.id}`);
          console.log('');
        });
        
        // Analyze oversight assignments
        const overseers = position.assignments.filter(a => a.role === 'OVERSEER');
        const keymen = position.assignments.filter(a => a.role === 'KEYMAN');
        const attendants = position.assignments.filter(a => a.role === 'ATTENDANT');
        
        console.log(`   📊 OVERSIGHT ANALYSIS:`);
        console.log(`      Overseers: ${overseers.length}`);
        console.log(`      Keymen: ${keymen.length}`);
        console.log(`      Attendants: ${attendants.length}`);
        
        if (overseers.length > 0) {
          console.log(`      🔵 Overseer Names: ${overseers.map(o => `${o.attendant?.firstName} ${o.attendant?.lastName}`).join(', ')}`);
        }
        
        if (keymen.length > 0) {
          console.log(`      🟣 Keyman Names: ${keymen.map(k => `${k.attendant?.firstName} ${k.attendant?.lastName}`).join(', ')}`);
        }
      } else {
        console.log('   ❌ No assignments found');
      }
    });
    
    // If no position found, search more broadly
    if (positions.length === 0) {
      console.log('\n🔍 Searching all positions for reference...');
      const allPositions = await prisma.positions.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          isActive: true
        },
        orderBy: { name: 'asc' }
      });
      
      console.log(`\nAll positions (${allPositions.length}):`);
      allPositions.forEach(p => {
        console.log(`  ${p.name} - Active: ${p.isActive}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPosition215();
