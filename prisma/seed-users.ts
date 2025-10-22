import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedUsers() {
  console.log('🌱 Seeding default users...')

  // Create default admin user
  const adminEmail = 'admin@jwscheduler.local'
  const adminPassword = 'admin123'
  
  const existingAdmin = await prisma.users.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    
    const adminUser = await prisma.users.create({
      data: {
        email: adminEmail,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
        emailVerified: new Date(),
        // Create associated account for credentials login
        accounts: {
          create: {
            type: 'credentials',
            provider: 'credentials',
            providerAccountId: adminEmail,
            // Store hashed password in account (this is a simplified approach)
          }
        }
      }
    })

    // Create a simple way to store the password for credentials auth
    // Note: In production, you'd want a more secure approach
    await prisma.users.update({
      where: { id: adminUser.id },
      data: {
        name: `${hashedPassword}` // Temporary storage - not ideal but functional
      }
    })

    console.log(`✅ Created admin user: ${adminEmail} / ${adminPassword}`)
  } else {
    console.log(`⏭️  Admin user already exists: ${adminEmail}`)
  }

  // Create a test overseer user
  const overseerEmail = 'overseer@jwscheduler.local'
  const overseerPassword = 'overseer123'
  
  const existingOverseer = await prisma.users.findUnique({
    where: { email: overseerEmail }
  })

  if (!existingOverseer) {
    const hashedPassword = await bcrypt.hash(overseerPassword, 12)
    
    const overseerUser = await prisma.users.create({
      data: {
        email: overseerEmail,
        firstName: 'Test',
        lastName: 'Overseer',
        role: 'OVERSEER',
        isActive: true,
        emailVerified: new Date(),
        name: `${hashedPassword}`, // Temporary password storage
        accounts: {
          create: {
            type: 'credentials',
            provider: 'credentials',
            providerAccountId: overseerEmail,
          }
        }
      }
    })

    console.log(`✅ Created overseer user: ${overseerEmail} / ${overseerPassword}`)
  } else {
    console.log(`⏭️  Overseer user already exists: ${overseerEmail}`)
  }

  console.log('🌱 User seeding completed!')
  console.log('')
  console.log('📋 LOGIN CREDENTIALS:')
  console.log('Admin: admin@jwscheduler.local / admin123')
  console.log('Overseer: overseer@jwscheduler.local / overseer123')
}

seedUsers()
  .catch((e) => {
    console.error('❌ Error seeding users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
