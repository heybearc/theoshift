const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugAPICalls() {
  console.log('🛡️ APEX GUARDIAN - REAL-TIME API DEBUGGING')
  console.log('==========================================')
  
  try {
    // Get the exact event ID from the URL that's failing
    console.log('\n1. CHECKING ALL EVENTS IN DATABASE:')
    
    const allEvents = await prisma.events.findMany({
      select: {
        id: true,
        name: true,
        eventType: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Total events: ${allEvents.length}`)
    allEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.name}`)
      console.log(`   ID: ${event.id}`)
      console.log(`   Type: ${event.eventType}`)
      console.log(`   Status: ${event.status}`)
      console.log(`   URL: https://jw-staging.cloudigan.net/events/${event.id}`)
      console.log('')
    })
    
    console.log('\n2. TESTING API ENDPOINT DIRECTLY:')
    
    if (allEvents.length > 0) {
      const testEvent = allEvents[0]
      console.log(`Testing with event: ${testEvent.name} (${testEvent.id})`)
      
      // Test the exact query that the API endpoint uses
      const apiResult = await prisma.events.findUnique({
        where: { id: testEvent.id },
        include: {
          positions: {
            include: {
              shifts: true,
              assignments: {
                include: {
                  attendant: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          event_attendant_associations: true,
          assignments: true,
          event_positions: true
        }
      })
      
      if (apiResult) {
        console.log('✅ API query successful')
        console.log(`   Event: ${apiResult.name}`)
        console.log(`   Positions: ${apiResult.positions.length}`)
        console.log(`   Legacy positions: ${apiResult.event_positions.length}`)
        
        // Transform exactly like the API does
        const transformedEvent = {
          ...apiResult,
          event_positions: apiResult.positions.map(position => ({
            id: position.id,
            positionNumber: position.positionNumber,
            title: position.name,
            department: position.area || "General",
            description: position.description,
            _count: {
              assignments: position.assignments.length
            }
          })),
          _count: {
            event_attendant_associations: apiResult.event_attendant_associations.length,
            assignments: apiResult.assignments.length,
            event_positions: apiResult.positions.length
          }
        }
        
        console.log('✅ Transformation successful')
        console.log(`   Transformed event_positions: ${transformedEvent.event_positions.length}`)
        console.log(`   _count: ${JSON.stringify(transformedEvent._count)}`)
        
      } else {
        console.log('❌ API query failed - event not found')
      }
    }
    
    console.log('\n3. CHECKING API FILE CONTENT:')
    
    const fs = require('fs')
    const path = require('path')
    
    const apiFile = 'pages/api/events/[id].ts'
    if (fs.existsSync(path.join(process.cwd(), apiFile))) {
      const content = fs.readFileSync(path.join(process.cwd(), apiFile), 'utf8')
      console.log('✅ API file exists')
      
      // Check for key components
      if (content.includes('getServerSession')) {
        console.log('✅ Authentication check present')
      } else {
        console.log('❌ Authentication check missing')
      }
      
      if (content.includes('prisma.events.findUnique')) {
        console.log('✅ Database query present')
      } else {
        console.log('❌ Database query missing')
      }
      
      if (content.includes('event_positions')) {
        console.log('✅ Frontend compatibility transformation present')
      } else {
        console.log('❌ Frontend compatibility transformation missing')
      }
      
    } else {
      console.log('❌ API file missing')
    }
    
    console.log('\n4. TESTING SESSION VALIDATION:')
    
    // Check if there are any active sessions
    const sessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { expires: 'desc' },
      take: 5
    })
    
    console.log(`Active sessions: ${sessions.length}`)
    sessions.forEach(session => {
      console.log(`   User: ${session.user.email} (${session.user.role})`)
      console.log(`   Expires: ${session.expires}`)
      console.log(`   Session ID: ${session.sessionToken.substring(0, 10)}...`)
    })
    
  } catch (error) {
    console.error('❌ DEBUG FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugAPICalls()
