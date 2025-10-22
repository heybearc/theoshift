const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testFrontendFlow() {
  console.log('🛡️ APEX GUARDIAN - FRONTEND FLOW TESTING')
  console.log('=========================================')
  
  try {
    const testEventId = 'd03ad529-4eb6-4c72-9265-9ec68bd33308'
    
    console.log('\n1. TESTING AUTHENTICATION FLOW:')
    
    // Check if admin user exists and password is correct
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@jwscheduler.local' },
      include: {
        accounts: true
      }
    })
    
    if (adminUser) {
      console.log(`✅ Admin user found: ${adminUser.email}`)
      console.log(`   Role: ${adminUser.role}`)
      console.log(`   Active: ${adminUser.isActive}`)
      console.log(`   Accounts: ${adminUser.accounts.length}`)
      
      // Test password verification (the password should be in passwordHash field)
      if (adminUser.passwordHash) {
        const isValidPassword = await bcrypt.compare('admin123', adminUser.passwordHash)
        console.log(`   Password valid: ${isValidPassword}`)
      } else {
        console.log('   ❌ No password hash found')
      }
    } else {
      console.log('❌ Admin user not found')
    }
    
    console.log('\n2. TESTING EVENT RETRIEVAL (Simulating Authenticated Request):')
    
    // Simulate what happens when an authenticated user requests an event
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
      console.log(`✅ Event retrieved: ${event.name}`)
      
      // Transform to frontend format
      const frontendEvent = {
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
      
      console.log('✅ Frontend transformation successful')
      console.log(`   Event positions: ${frontendEvent.event_positions.length}`)
      console.log(`   Count structure: ${JSON.stringify(frontendEvent._count)}`)
      
      // Test what the frontend expects to access
      console.log('\n3. TESTING FRONTEND DATA ACCESS:')
      console.log(`   event.name: ${frontendEvent.name}`)
      console.log(`   event.eventType: ${frontendEvent.eventType}`)
      console.log(`   event.status: ${frontendEvent.status}`)
      console.log(`   event._count.event_positions: ${frontendEvent._count.event_positions}`)
      console.log(`   event.event_positions.length: ${frontendEvent.event_positions.length}`)
      
      if (frontendEvent.event_positions.length > 0) {
        console.log(`   First position title: ${frontendEvent.event_positions[0].title}`)
        console.log(`   First position department: ${frontendEvent.event_positions[0].department}`)
      }
      
    } else {
      console.log(`❌ Event not found: ${testEventId}`)
    }
    
    console.log('\n4. TESTING NEXTAUTH CONFIGURATION:')
    
    // Check if NextAuth tables exist
    try {
      const sessions = await prisma.session.count()
      console.log(`✅ Sessions table accessible: ${sessions} sessions`)
    } catch (error) {
      console.log(`❌ Sessions table error: ${error.message}`)
    }
    
    try {
      const accounts = await prisma.account.count()
      console.log(`✅ Accounts table accessible: ${accounts} accounts`)
    } catch (error) {
      console.log(`❌ Accounts table error: ${error.message}`)
    }
    
    console.log('\n5. TESTING API ROUTE STRUCTURE:')
    
    const fs = require('fs')
    const path = require('path')
    
    // Check if auth API exists
    const authPath = 'pages/api/auth/[...nextauth].ts'
    if (fs.existsSync(path.join(process.cwd(), authPath))) {
      console.log(`✅ ${authPath} exists`)
      
      // Read the auth config to see if it's properly configured
      const authContent = fs.readFileSync(path.join(process.cwd(), authPath), 'utf8')
      if (authContent.includes('CredentialsProvider')) {
        console.log('✅ Credentials provider configured')
      } else {
        console.log('❌ Credentials provider not found')
      }
    } else {
      console.log(`❌ ${authPath} missing`)
    }
    
    console.log('\n🛡️ APEX GUARDIAN DIAGNOSIS COMPLETE')
    console.log('=====================================')
    
  } catch (error) {
    console.error('❌ FRONTEND FLOW TEST FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFrontendFlow()
