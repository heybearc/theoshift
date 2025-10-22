const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAttendants() {
  console.log('🔍 Debugging attendant relationships...');
  
  // Get all attendants with their leadership relationships
  const attendants = await prisma.attendants.findMany({
    where: { isActive: true },
    include: {
      overseer_assignments: {
        include: {
          overseer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      },
      keyman_assignments: {
        include: {
          keyman: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });
  
  console.log(`\n📋 Found ${attendants.length} active attendants:`);
  attendants.forEach(att => {
    const overseer = att.overseer_assignments?.[0]?.overseer;
    const keyman = att.keyman_assignments?.[0]?.keyman;
    
    console.log({
      name: `${att.firstName} ${att.lastName}`,
      overseer: overseer ? `${overseer.firstName} ${overseer.lastName}` : 'None',
      keyman: keyman ? `${keyman.firstName} ${keyman.lastName}` : 'None',
      congregation: att.congregation
    });
  });
  
  // Get Station 16 assignments
  console.log('\n🏢 Station 16 assignments:');
  const station16 = await prisma.positions.findFirst({
    where: { name: { contains: 'Station 16' } },
    include: {
      assignments: {
        include: {
          attendant: true
        }
      }
    }
  });
  
  if (station16) {
    console.log(`Position: ${station16.name}`);
    station16.assignments.forEach(assignment => {
      console.log({
        role: assignment.role,
        attendantId: assignment.attendantId,
        attendantName: assignment.attendant ? `${assignment.attendant.firstName} ${assignment.attendant.lastName}` : 'No attendant'
      });
    });
  }
  
  await prisma.$disconnect();
}

debugAttendants().catch(console.error);
