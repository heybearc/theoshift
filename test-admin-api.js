// Test admin API directly
const { PrismaClient } = require('@prisma/client')

async function testAdminAPI() {
  console.log('🔍 Testing admin API functionality...')
  
  const prisma = new PrismaClient()

  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connected')

    // Test users query
    console.log('👥 Testing users query...')
    const users = await prisma.users.findMany({
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
    
    console.log(`✅ Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })

    // Test count
    const userCount = await prisma.users.count()
    console.log(`📊 Total users: ${userCount}`)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('📋 Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminAPI()
