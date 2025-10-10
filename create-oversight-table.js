const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPositionOversightTable() {
  try {
    console.log('🏗️  Creating position_oversight_assignments table...');
    
    // Create the table using raw SQL through Prisma
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS position_oversight_assignments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        overseer_id TEXT REFERENCES attendants(id) ON DELETE SET NULL,
        keyman_id TEXT REFERENCES attendants(id) ON DELETE SET NULL,
        assigned_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- Ensure one oversight record per position per event
        UNIQUE(position_id, event_id)
      )
    `;
    
    console.log('✅ Table created successfully!');
    
    // Create indexes
    console.log('🔍 Creating indexes...');
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_position_oversight_event 
      ON position_oversight_assignments(event_id)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_position_oversight_position 
      ON position_oversight_assignments(position_id)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_position_oversight_overseer 
      ON position_oversight_assignments(overseer_id)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_position_oversight_keyman 
      ON position_oversight_assignments(keyman_id)
    `;
    
    console.log('✅ Indexes created successfully!');
    
    // Verify table creation
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'position_oversight_assignments'
      )
    `;
    
    console.log('🔍 Table verification:', tableExists[0].exists ? 'EXISTS' : 'NOT FOUND');
    
    if (tableExists[0].exists) {
      console.log('🎉 Position oversight table setup complete!');
      console.log('');
      console.log('📋 Table Features:');
      console.log('   • Shift-independent oversight assignments');
      console.log('   • One oversight record per position per event');
      console.log('   • Supports both overseer and keyman assignments');
      console.log('   • Optimized indexes for smart assignment queries');
      console.log('   • Cascade deletes for data integrity');
      console.log('');
      console.log('✅ Ready for API implementation!');
    }
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPositionOversightTable();
