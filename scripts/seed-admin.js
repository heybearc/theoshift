const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function seedAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.users.findFirst({
      where: { role: 'ADMIN' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email)
      return
    }

    // Create admin user
    const adminEmail = 'admin@jwscheduler.local'
    const adminPassword = 'AdminPass123!'
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    const adminUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: adminEmail,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        passwordHash: passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('Email:', adminEmail)
    console.log('Password:', adminPassword)
    console.log('User ID:', adminUser.id)
    console.log('')
    console.log('🔐 Please change the default password after first login!')

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedAdmin()
