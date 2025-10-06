const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function diagnoseEventIssue() {
  console.log('🛡️ APEX GUARDIAN - EVENT DIAGNOSIS')
  console.log('=====================================')
  
  try {
    // 1. Check database connection
    console.log('\n1. DATABASE CONNECTION TEST:')
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // 2. Check if events exist
    console.log('\n2. EVENTS TABLE ANALYSIS:')
    const eventCount = await prisma.events.count()
    console.log(`Total events in database: ${eventCount}`)
    
    if (eventCount > 0) {
      const events = await prisma.events.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          eventType: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log('Recent events:')
      events.forEach(event => {
        console.log(`  - ${event.name} (${event.id}) - ${event.status}`)
      })
    }
    
    // 3. Check specific test event
    console.log('\n3. TEST EVENT VERIFICATION:')
    const testEventId = 'd03ad529-4eb6-4c72-9265-9ec68bd33308'
    const testEvent = await prisma.events.findUnique({
      where: { id: testEventId },
      include: {
        positions: true,
        event_attendant_associations: true,
        assignments: true
      }
    })
    
    if (testEvent) {
      console.log(`✅ Test event found: ${testEvent.name}`)
      console.log(`   Positions: ${testEvent.positions.length}`)
      console.log(`   Associations: ${testEvent.event_attendant_associations.length}`)
      console.log(`   Assignments: ${testEvent.assignments.length}`)
    } else {
      console.log(`❌ Test event NOT found: ${testEventId}`)
    }
    
    // 4. Check Prisma schema models
    console.log('\n4. PRISMA SCHEMA VERIFICATION:')
    
    // Test positions table
    try {
      const positionsCount = await prisma.positions.count()
      console.log(`✅ positions table accessible: ${positionsCount} records`)
    } catch (error) {
      console.log(`❌ positions table error: ${error.message}`)
    }
    
    // Test shift_templates table
    try {
      const templatesCount = await prisma.shift_templates.count()
      console.log(`✅ shift_templates table accessible: ${templatesCount} records`)
    } catch (error) {
      console.log(`❌ shift_templates table error: ${error.message}`)
    }
    
    // Test event_positions table (legacy)
    try {
      const eventPositionsCount = await prisma.event_positions.count()
      console.log(`✅ event_positions table accessible: ${eventPositionsCount} records`)
    } catch (error) {
      console.log(`❌ event_positions table error: ${error.message}`)
    }
    
    // 5. Test API query structure
    console.log('\n5. API QUERY STRUCTURE TEST:')
    if (eventCount > 0) {
      try {
        const apiTestEvent = await prisma.events.findFirst({
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
        
        console.log('✅ API query structure works')
        console.log(`   Event: ${apiTestEvent.name}`)
        console.log(`   New positions: ${apiTestEvent.positions.length}`)
        console.log(`   Legacy event_positions: ${apiTestEvent.event_positions.length}`)
        
      } catch (error) {
        console.log(`❌ API query structure error: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ DIAGNOSIS FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseEventIssue()
