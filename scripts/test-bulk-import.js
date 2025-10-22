const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testBulkImport() {
  console.log('🛡️ APEX GUARDIAN - BULK IMPORT TEST')
  console.log('===================================')
  
  try {
    const testEventId = 'd60272ad-9c14-4738-b201-20c29c4e59d5'
    
    console.log('\n1. TESTING EVENT VERIFICATION:')
    
    const event = await prisma.events.findUnique({
      where: { id: testEventId }
    })
    
    if (event) {
      console.log(`✅ Test event found: ${event.name}`)
    } else {
      console.log(`❌ Test event not found: ${testEventId}`)
      return
    }
    
    console.log('\n2. TESTING SAMPLE BULK IMPORT DATA:')
    
    const sampleData = {
      attendants: [
        {
          firstName: "John",
          lastName: "Smith", 
          email: "john.smith@example.com",
          phone: "216-555-0123",
          congregation: "Central Congregation",
          formsOfService: ["Elder", "Exemplary"],
          isActive: true,
          notes: "Available for all assignments"
        },
        {
          firstName: "Jane",
          lastName: "Doe",
          email: "jane.doe@example.com", 
          phone: "216-555-0124",
          congregation: "North Congregation",
          formsOfService: ["Ministerial Servant", "Regular Pioneer"],
          isActive: true,
          notes: ""
        }
      ],
      eventId: testEventId
    }
    
    console.log('✅ Sample import data:')
    console.log(JSON.stringify(sampleData, null, 2))
    
    console.log('\n3. TESTING ATTENDANT CREATION LOGIC:')
    
    // Test what would happen for each attendant
    for (let i = 0; i < sampleData.attendants.length; i++) {
      const attendantData = sampleData.attendants[i]
      
      console.log(`\nProcessing attendant ${i + 1}: ${attendantData.firstName} ${attendantData.lastName}`)
      
      // Check if attendant exists
      const existingAttendant = await prisma.attendants.findFirst({
        where: { email: attendantData.email }
      })
      
      if (existingAttendant) {
        console.log(`  ✅ Attendant exists: ${existingAttendant.id}`)
        console.log(`  📝 Would update: ${existingAttendant.firstName} ${existingAttendant.lastName}`)
        
        // Check if association exists
        const existingAssociation = await prisma.event_attendant_associations.findFirst({
          where: {
            eventId: testEventId,
            attendantId: existingAttendant.id
          }
        })
        
        if (existingAssociation) {
          console.log(`  🔗 Association exists: ${existingAssociation.id}`)
        } else {
          console.log(`  ➕ Would create association`)
        }
      } else {
        console.log(`  ➕ Would create new attendant`)
        console.log(`  🔗 Would create association`)
      }
    }
    
    console.log('\n4. TESTING CURRENT ATTENDANTS:')
    
    const currentAttendants = await prisma.attendants.count()
    console.log(`✅ Current total attendants: ${currentAttendants}`)
    
    const eventAssociations = await prisma.event_attendant_associations.count({
      where: { eventId: testEventId }
    })
    console.log(`✅ Current event associations: ${eventAssociations}`)
    
    console.log('\n5. TESTING FORMS OF SERVICE:')
    
    const validForms = ["Elder", "Ministerial Servant", "Exemplary", "Regular Pioneer", "Other Department"]
    console.log('✅ Valid forms of service:')
    validForms.forEach(form => console.log(`   - ${form}`))
    
    console.log('\n🛡️ BULK IMPORT TEST COMPLETE')
    console.log('============================')
    console.log('READY FOR TESTING:')
    console.log('1. Use the sample CSV format shown above')
    console.log('2. Ensure forms of service match exactly')
    console.log('3. Check browser console for detailed errors')
    console.log('4. Verify session authentication is working')
    
  } catch (error) {
    console.error('❌ BULK IMPORT TEST FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBulkImport()
