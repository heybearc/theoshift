const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    const testPassword = 'AdminPass123!';
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    
    console.log('Testing password:', testPassword);
    console.log('Hash exists:', !!user.passwordHash);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      console.log('\n❌ Password does not match!');
      console.log('Resetting password...');
      
      const newHash = await bcrypt.hash(testPassword, 12);
      await prisma.users.update({
        where: { email: 'admin@jwscheduler.local' },
        data: { passwordHash: newHash }
      });
      
      console.log('✅ Password reset complete');
    } else {
      console.log('\n✅ Password is correct');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
