// Simple database connection test for JW Attendant Scheduler
const { PrismaClient } = require('@prisma/client')

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://jw_user:jw_password@10.92.3.21:5432/jw_attendant_scheduler'
      }
    }
  })

  try {
    // Test basic connection
    console.log('📡 Attempting to connect to database...')
    await prisma.$connect()
    console.log('✅ Database connection successful')

    // Test if users table exists
    console.log('🔍 Checking users table...')
    const userCount = await prisma.users.count()
    console.log(`✅ Users table accessible, found ${userCount} users`)

    // Test if we can create a simple user
    console.log('👤 Testing user creation...')
    const testUser = await prisma.users.create({
      data: {
        firstName: 'Test',
        lastName: 'Admin',
        email: 'test@jwscheduler.local',
        role: 'ADMIN',
        isActive: true,
        passwordHash: '$2a$10$dummy.hash.for.testing'
      }
    })
    console.log('✅ User creation successful:', testUser.email)

    // Clean up test user
    await prisma.users.delete({
      where: { id: testUser.id }
    })
    console.log('🧹 Test user cleaned up')

  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    console.error('📋 Error details:', error)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

testDatabaseConnection()
