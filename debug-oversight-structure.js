const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugOversightStructure() {
  console.log('🔍 DEBUG: Oversight Structure Analysis');
  console.log('=' .repeat(60));
  
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459';
  
  try {
    // Get all positions with their assignments
    const positions = await prisma.positions.findMany({
      where: { eventId, isActive: true },
      include: {
        assignments: {
          include: {
            attendant: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n📊 OVERSIGHT ANALYSIS FOR ALL POSITIONS:`);
    console.log(`Total active positions: ${positions.length}`);
    
    let totalOverseers = 0;
    let totalKeymen = 0;
    let totalAttendants = 0;
    let positionsWithOverseer = 0;
    let positionsWithKeyman = 0;
    let positionsWithBoth = 0;
    
    positions.forEach((position, index) => {
      const overseers = position.assignments.filter(a => a.role === 'OVERSEER');
      const keymen = position.assignments.filter(a => a.role === 'KEYMAN');
      const attendants = position.assignments.filter(a => a.role === 'ATTENDANT');
      
      totalOverseers += overseers.length;
      totalKeymen += keymen.length;
      totalAttendants += attendants.length;
      
      if (overseers.length > 0) positionsWithOverseer++;
      if (keymen.length > 0) positionsWithKeyman++;
      if (overseers.length > 0 && keymen.length > 0) positionsWithBoth++;
      
      console.log(`\n${index + 1}. ${position.name}`);
      console.log(`   Overseers: ${overseers.length} | Keymen: ${keymen.length} | Attendants: ${attendants.length}`);
      
      if (overseers.length > 0) {
        console.log(`   🔵 Overseers: ${overseers.map(o => `${o.attendant?.firstName} ${o.attendant?.lastName}`).join(', ')}`);
      }
      
      if (keymen.length > 0) {
        console.log(`   🟣 Keymen: ${keymen.map(k => `${k.attendant?.firstName} ${k.attendant?.lastName}`).join(', ')}`);
      }
      
      if (attendants.length > 0) {
        console.log(`   👥 Attendants: ${attendants.map(a => `${a.attendant?.firstName} ${a.attendant?.lastName}`).join(', ')}`);
      }
      
      // Flag positions that might need keyman assignments
      if (overseers.length > 0 && keymen.length === 0) {
        console.log(`   ⚠️  Has overseer but no keyman - might need keyman assignment`);
      }
    });
    
    console.log(`\n📈 SUMMARY STATISTICS:`);
    console.log(`Total Overseers: ${totalOverseers}`);
    console.log(`Total Keymen: ${totalKeymen}`);
    console.log(`Total Attendants: ${totalAttendants}`);
    console.log(`Positions with Overseer: ${positionsWithOverseer}/${positions.length}`);
    console.log(`Positions with Keyman: ${positionsWithKeyman}/${positions.length}`);
    console.log(`Positions with both Overseer & Keyman: ${positionsWithBoth}/${positions.length}`);
    
    console.log(`\n🎯 RECOMMENDATIONS:`);
    if (positionsWithOverseer > positionsWithKeyman) {
      console.log(`⚠️  ${positionsWithOverseer - positionsWithKeyman} positions have overseers but no keymen`);
      console.log(`💡 Consider assigning keymen to positions that have overseers`);
    }
    
    // Check if there are available attendants who could be keymen
    const allAttendants = await prisma.attendants.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        formsOfService: true
      }
    });
    
    const potentialKeymen = allAttendants.filter(attendant => 
      attendant.formsOfService && 
      attendant.formsOfService.some(service => 
        service.toLowerCase().includes('keyman') || 
        service.toLowerCase().includes('key man') ||
        service.toLowerCase().includes('assistant')
      )
    );
    
    console.log(`\n👥 POTENTIAL KEYMEN (${potentialKeymen.length} attendants):`);
    potentialKeymen.forEach(attendant => {
      console.log(`   ${attendant.firstName} ${attendant.lastName} - Forms: ${attendant.formsOfService.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugOversightStructure();
