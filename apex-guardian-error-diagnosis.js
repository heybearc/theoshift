const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function apexGuardianErrorDiagnosis() {
  console.log('🛡️ APEX GUARDIAN - EMERGENCY ERROR DIAGNOSIS');
  console.log('=' .repeat(80));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // 1. Test database connectivity
    console.log('\n📊 1. DATABASE CONNECTIVITY TEST');
    console.log('-'.repeat(50));
    
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection: OK');
    
    // 2. Test basic position query
    console.log('\n📊 2. BASIC POSITION QUERY TEST');
    console.log('-'.repeat(50));
    
    const positionCount = await prisma.positions.count({
      where: { eventId }
    });
    console.log(`✅ Positions found: ${positionCount}`);
    
    // 3. Test assignment query that might be causing errors
    console.log('\n📊 3. ASSIGNMENT QUERY TEST');
    console.log('-'.repeat(50));
    
    const assignmentCount = await prisma.position_assignments.count({
      where: {
        position: { eventId }
      }
    });
    console.log(`✅ Assignments found: ${assignmentCount}`);
    
    // 4. Test the complex query used in positions page
    console.log('\n📊 4. COMPLEX POSITIONS PAGE QUERY TEST');
    console.log('-'.repeat(50));
    
    const positions = await prisma.positions.findMany({
      where: { eventId },
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
                name: true
              }
            }
          }
        },
        shifts: true
      },
      take: 5 // Limit to first 5 for testing
    });
    
    console.log(`✅ Complex query successful: ${positions.length} positions loaded`);
    
    // 5. Test for potential null/undefined issues
    console.log('\n📊 5. DATA INTEGRITY CHECK');
    console.log('-'.repeat(50));
    
    let nullAttendants = 0;
    let nullShifts = 0;
    let nullOversight = 0;
    
    positions.forEach(position => {
      position.assignments.forEach(assignment => {
        if (!assignment.attendant) nullAttendants++;
        if (!assignment.shift) nullShifts++;
        if ((assignment.role === 'OVERSEER' && !assignment.overseer) || 
            (assignment.role === 'KEYMAN' && !assignment.keyman)) {
          nullOversight++;
        }
      });
    });
    
    console.log(`Null attendant references: ${nullAttendants}`);
    console.log(`Null shift references: ${nullShifts}`);
    console.log(`Null oversight references: ${nullOversight}`);
    
    if (nullAttendants > 0 || nullShifts > 0 || nullOversight > 0) {
      console.log('⚠️  Data integrity issues detected - this could cause frontend errors');
    } else {
      console.log('✅ Data integrity: OK');
    }
    
    // 6. Test recent oversight assignments
    console.log('\n📊 6. RECENT OVERSIGHT ASSIGNMENTS CHECK');
    console.log('-'.repeat(50));
    
    const recentAssignments = await prisma.position_assignments.findMany({
      where: {
        position: { eventId },
        role: { in: ['OVERSEER', 'KEYMAN'] }
      },
      orderBy: { assignedAt: 'desc' },
      take: 10,
      include: {
        attendant: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        position: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Recent oversight assignments: ${recentAssignments.length}`);
    recentAssignments.forEach((assignment, i) => {
      console.log(`${i + 1}. ${assignment.attendant?.firstName} ${assignment.attendant?.lastName} - ${assignment.role} at ${assignment.position.name}`);
    });
    
    // 7. Check for orphaned references
    console.log('\n📊 7. ORPHANED REFERENCE CHECK');
    console.log('-'.repeat(50));
    
    const orphanedOverseer = await prisma.position_assignments.count({
      where: {
        position: { eventId },
        role: 'OVERSEER',
        overseer: null
      }
    });
    
    const orphanedKeyman = await prisma.position_assignments.count({
      where: {
        position: { eventId },
        role: 'KEYMAN',
        keyman: null
      }
    });
    
    console.log(`Orphaned overseer assignments: ${orphanedOverseer}`);
    console.log(`Orphaned keyman assignments: ${orphanedKeyman}`);
    
    if (orphanedOverseer > 0 || orphanedKeyman > 0) {
      console.log('🚨 CRITICAL: Orphaned oversight references detected!');
      console.log('This will cause internal server errors when frontend tries to access null references');
    }
    
    console.log('\n🎯 APEX GUARDIAN DIAGNOSIS COMPLETE');
    if (nullAttendants === 0 && nullShifts === 0 && nullOversight === 0 && orphanedOverseer === 0 && orphanedKeyman === 0) {
      console.log('✅ No obvious data issues detected');
      console.log('💡 Error might be in frontend rendering or API endpoint logic');
    } else {
      console.log('🚨 DATA ISSUES DETECTED - This is likely causing the internal server error');
    }
    
  } catch (error) {
    console.error('🚨 APEX GUARDIAN DIAGNOSIS ERROR:', error);
    console.log('🔍 Error details:', error.message);
    console.log('🔍 Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

apexGuardianErrorDiagnosis();
