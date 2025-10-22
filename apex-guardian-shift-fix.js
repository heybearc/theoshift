const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function apexGuardianShiftFix() {
  console.log('🛡️ APEX GUARDIAN - ALL DAY SHIFT FIX');
  console.log('=' .repeat(80));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // 1. Find positions without All Day shifts
    console.log('\n📊 1. POSITIONS WITHOUT ALL DAY SHIFTS');
    console.log('-'.repeat(50));
    
    const positionsWithoutAllDay = await prisma.positions.findMany({
      where: {
        eventId,
        isActive: true,
        shifts: {
          none: {
            name: 'All Day'
          }
        }
      },
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Positions without All Day shift: ${positionsWithoutAllDay.length}`);
    
    if (positionsWithoutAllDay.length === 0) {
      console.log('✅ All positions have All Day shifts');
      return;
    }
    
    console.log('Positions needing All Day shifts:');
    positionsWithoutAllDay.forEach((pos, i) => {
      console.log(`${i + 1}. ${pos.name}`);
    });
    
    // 2. Create All Day shifts for positions that need them
    console.log('\n📊 2. CREATING ALL DAY SHIFTS');
    console.log('-'.repeat(50));
    
    let createdCount = 0;
    
    for (const position of positionsWithoutAllDay) {
      try {
        const allDayShift = await prisma.position_shifts.create({
          data: {
            id: require('crypto').randomUUID(),
            positionId: position.id,
            name: 'All Day',
            startTime: null,
            endTime: null,
            isAllDay: true,
            sequence: 1
          }
        });
        
        console.log(`✅ Created All Day shift for ${position.name}`);
        createdCount++;
      } catch (error) {
        console.log(`❌ Failed to create All Day shift for ${position.name}: ${error.message}`);
      }
    }
    
    console.log(`\n🎯 CREATED ${createdCount} ALL DAY SHIFTS`);
    
    // 3. Verify fix
    console.log('\n📊 3. VERIFICATION');
    console.log('-'.repeat(50));
    
    const remainingWithoutAllDay = await prisma.positions.count({
      where: {
        eventId,
        isActive: true,
        shifts: {
          none: {
            name: 'All Day'
          }
        }
      }
    });
    
    console.log(`Positions still without All Day shift: ${remainingWithoutAllDay}`);
    
    if (remainingWithoutAllDay === 0) {
      console.log('✅ ALL POSITIONS NOW HAVE ALL DAY SHIFTS');
      console.log('💡 Oversight assignments should now work correctly');
    } else {
      console.log('⚠️  Some positions still missing All Day shifts');
    }
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN SHIFT FIX ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

apexGuardianShiftFix();
