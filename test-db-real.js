// Real database connection test with correct credentials
const { PrismaClient } = require('@prisma/client')

async function testRealDatabaseConnection() {
  console.log('🔍 Testing REAL database connection...')
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://jw_scheduler_staging:jw_password@10.92.3.21:5432/theoshift_scheduler_staging'
      }
    }
  })

  try {
    // Test basic connection
    console.log('📡 Attempting to connect to staging database...')
    await prisma.$connect()
    console.log('✅ Database connection successful')

    // Test if users table exists and get a sample user
    console.log('🔍 Checking users table...')
    const userCount = await prisma.users.count()
    console.log(`✅ Users table accessible, found ${userCount} users`)

    // Get a sample user to check for serialization issues
    const sampleUser = await prisma.users.findFirst({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        emailVerified: true,
        inviteExpiry: true,
        image: true,
        role: true
      }
    })
    
    if (sampleUser) {
      console.log('👤 Sample user data:')
      console.log('- ID:', sampleUser.id)
      console.log('- Email:', sampleUser.email)
      console.log('- Name:', sampleUser.firstName, sampleUser.lastName)
      console.log('- Role:', sampleUser.role)
      console.log('- Created:', sampleUser.createdAt)
      console.log('- Updated:', sampleUser.updatedAt)
      console.log('- Last Login:', sampleUser.lastLogin)
      console.log('- Email Verified:', sampleUser.emailVerified)
      console.log('- Invite Expiry:', sampleUser.inviteExpiry)
      console.log('- Image:', sampleUser.image)
      
      // Test JSON serialization
      console.log('🧪 Testing JSON serialization...')
      try {
        const serialized = JSON.stringify(sampleUser)
        console.log('✅ JSON serialization successful')
      } catch (serError) {
        console.error('❌ JSON serialization failed:', serError.message)
      }
    } else {
      console.log('⚠️ No users found in database')
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    console.error('📋 Error details:', error)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

testRealDatabaseConnection()
