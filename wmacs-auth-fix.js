const { PrismaClient } = require('@prisma/client');

async function wmacsAuthFix() {
  console.log('🔧 WMACS Guardian: Fixing authentication issue...');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if users table exists and is accessible
    const userCount = await prisma.users.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    // Test specific admin user
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found in database');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Password hash length: ${adminUser.passwordHash?.length || 0}`);
      
      // Test bcrypt comparison
      const bcrypt = require('bcryptjs');
      if (adminUser.passwordHash) {
        const isValid = await bcrypt.compare('admin123', adminUser.passwordHash);
        console.log(`   Password validation: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (!isValid) {
          console.log('🔧 WMACS Guardian: Fixing password hash...');
          const newHash = await bcrypt.hash('admin123', 12);
          await prisma.users.update({
            where: { email: 'admin@jwscheduler.local' },
            data: { passwordHash: newHash }
          });
          console.log('✅ Password hash updated');
        }
      }
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('❌ WMACS Guardian Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

wmacsAuthFix();
