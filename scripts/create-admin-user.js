const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  console.log('🛡️ APEX GUARDIAN - CREATING ADMIN USER')
  console.log('====================================')
  
  try {
    const email = 'admin@jwscheduler.local'
    const password = 'admin123'
    
    // Check if admin user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      console.log(`✅ Admin user already exists: ${existingUser.email}`)
      return existingUser
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Create admin user
    const adminUser = await prisma.users.create({
      data: {
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Created admin user: ${adminUser.email}`)
    console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`)
    console.log(`   Role: ${adminUser.role}`)
    console.log(`   ID: ${adminUser.id}`)
    
    console.log('\n🔐 LOGIN CREDENTIALS:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    
    return adminUser
    
  } catch (error) {
    console.error('❌ CREATE ADMIN USER FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
