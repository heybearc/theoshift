const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    console.log('🔍 Checking existing table schemas...');
    
    const positionsSchema = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'positions' 
      AND column_name = 'id'
    `;
    console.log('Positions ID column:', positionsSchema);
    
    const attendantsSchema = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'attendants' 
      AND column_name = 'id'
    `;
    console.log('Attendants ID column:', attendantsSchema);
    
    const eventsSchema = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name = 'id'
    `;
    console.log('Events ID column:', eventsSchema);
    
    const usersSchema = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'id'
    `;
    console.log('Users ID column:', usersSchema);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
