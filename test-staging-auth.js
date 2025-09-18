#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testStagingAuth() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing staging database connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check users
    const users = await prisma.users.findMany();
    console.log(`📊 Found ${users.length} users in database`);
    
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Has password: ${!!user.passwordHash}`);
    });
    
    // Test admin user specifically
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Has password hash: ${!!adminUser.passwordHash}`);
      
      // Test password verification
      if (adminUser.passwordHash) {
        const isValid = await bcrypt.compare('AdminPass123!', adminUser.passwordHash);
        console.log(`   Password valid: ${isValid}`);
      }
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testStagingAuth();
