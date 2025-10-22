const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testSessionAuth() {
  console.log('🛡️ APEX GUARDIAN - SESSION AUTHENTICATION TEST')
  console.log('===============================================')
  
  try {
    console.log('\n1. CHECKING ACTIVE SESSIONS:')
    
    const sessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
            isActive: true
          }
        }
      },
      orderBy: { expires: 'desc' }
    })
    
    console.log(`Total sessions: ${sessions.length}`)
    
    if (sessions.length > 0) {
      sessions.forEach((session, index) => {
        console.log(`Session ${index + 1}:`)
        console.log(`   User: ${session.user.email}`)
        console.log(`   Expires: ${session.expires}`)
        console.log(`   Token: ${session.sessionToken.substring(0, 20)}...`)
        console.log(`   Valid: ${session.expires > new Date() ? 'YES' : 'EXPIRED'}`)
      })
    } else {
      console.log('❌ No active sessions found')
      console.log('This means users are not staying logged in!')
    }
    
    console.log('\n2. CHECKING NEXTAUTH CONFIGURATION:')
    
    // Check environment variables
    const requiredVars = ['NEXTAUTH_SECRET', 'NEXTAUTH_URL']
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`✅ ${varName}: ${varName === 'NEXTAUTH_URL' ? process.env[varName] : 'SET'}`)
      } else {
        console.log(`❌ ${varName}: MISSING`)
      }
    })
    
    console.log('\n3. TESTING EVENT API WITH MOCK SESSION:')
    
    const testEventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    
    // Test if the event exists
    const event = await prisma.events.findUnique({
      where: { id: testEventId },
      include: {
        event_attendant_associations: true,
        assignments: true,
        event_positions: true
      }
    })
    
    if (event) {
      console.log(`✅ Event exists: ${event.name}`)
      
      // Simulate API response
      const apiResponse = {
        success: true,
        data: {
          ...event,
          _count: {
            event_attendant_associations: event.event_attendant_associations.length,
            assignments: event.assignments.length,
            event_positions: event.event_positions.length
          }
        }
      }
      
      console.log('✅ API response would be:', JSON.stringify(apiResponse, null, 2).substring(0, 200) + '...')
      
    } else {
      console.log(`❌ Event not found: ${testEventId}`)
    }
    
    console.log('\n4. DEBUGGING SUGGESTIONS:')
    console.log('========================')
    
    if (sessions.length === 0) {
      console.log('🔍 NO SESSIONS FOUND - This is the likely issue!')
      console.log('')
      console.log('Possible causes:')
      console.log('1. NextAuth session creation is failing')
      console.log('2. Session cookies are not being set properly')
      console.log('3. NEXTAUTH_URL mismatch between server and client')
      console.log('4. Session storage is not working')
      console.log('')
      console.log('Debug steps:')
      console.log('1. Check browser dev tools for session cookies')
      console.log('2. Look for next-auth.session-token cookie')
      console.log('3. Check if login actually creates a session in database')
      console.log('4. Verify NEXTAUTH_URL matches exactly')
    } else {
      console.log('✅ Sessions exist - issue might be elsewhere')
    }
    
  } catch (error) {
    console.error('❌ SESSION AUTH TEST FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSessionAuth()
