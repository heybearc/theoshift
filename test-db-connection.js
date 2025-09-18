#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check admin user
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@jwscheduler.local' }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found:', {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        hasPassword: !!adminUser.passwordHash,
        isActive: adminUser.isActive
      });
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Test user count
    const userCount = await prisma.users.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
