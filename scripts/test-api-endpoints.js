const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAPIEndpoints() {
  console.log('🛡️ APEX GUARDIAN - API ENDPOINT TESTING')
  console.log('=======================================')
  
  try {
    // Test the exact API logic that the frontend calls
    const testEventId = 'd03ad529-4eb6-4c72-9265-9ec68bd33308'
    
    console.log('\n1. TESTING EVENTS LIST API LOGIC:')
    
    // Simulate the events API call
    const page = 1
    const limit = 10
    const skip = (page - 1) * limit
    
    const [events, total] = await Promise.all([
      prisma.events.findMany({
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
        include: {
          positions: {
            select: { id: true }
          },
          event_attendant_associations: {
            select: { id: true }
          },
          assignments: {
            select: { id: true }
          }
        }
      }),
      prisma.events.count()
    ])
    
    console.log(`✅ Events API logic works: ${events.length} events found`)
    
    // Transform events to match expected format
    const transformedEvents = events.map(event => ({
      ...event,
      _count: {
        event_positions: event.positions.length,
        event_attendant_associations: event.event_attendant_associations.length,
        assignments: event.assignments.length
      }
    }))
    
    console.log('✅ Event transformation works')
    console.log(`   First event: ${transformedEvents[0]?.name}`)
    console.log(`   _count structure: ${JSON.stringify(transformedEvents[0]?._count)}`)
    
    console.log('\n2. TESTING INDIVIDUAL EVENT API LOGIC:')
    
    const event = await prisma.events.findUnique({
      where: { id: testEventId },
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
    
    if (event) {
      console.log(`✅ Individual event API logic works: ${event.name}`)
      
      // Transform new positions to match old event_positions format
      const transformedEvent = {
        ...event,
        event_positions: event.positions.map(position => ({
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
          event_attendant_associations: event.event_attendant_associations.length,
          assignments: event.assignments.length,
          event_positions: event.positions.length
        }
      }
      
      console.log('✅ Event transformation works')
      console.log(`   event_positions: ${transformedEvent.event_positions.length}`)
      console.log(`   _count: ${JSON.stringify(transformedEvent._count)}`)
      
    } else {
      console.log(`❌ Event not found: ${testEventId}`)
    }
    
    console.log('\n3. TESTING USER AUTHENTICATION:')
    
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    })
    
    console.log(`✅ Users found: ${users.length}`)
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Active: ${user.isActive}`)
    })
    
    console.log('\n4. TESTING FILE EXISTENCE:')
    const fs = require('fs')
    const path = require('path')
    
    const apiFiles = [
      'pages/api/events.ts',
      'pages/api/events/[id].ts',
      'pages/api/events/[id]/positions/index.ts',
      'pages/api/shift-templates.ts'
    ]
    
    apiFiles.forEach(file => {
      if (fs.existsSync(path.join(process.cwd(), file))) {
        console.log(`✅ ${file} exists`)
      } else {
        console.log(`❌ ${file} missing`)
      }
    })
    
  } catch (error) {
    console.error('❌ API ENDPOINT TEST FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIEndpoints()
