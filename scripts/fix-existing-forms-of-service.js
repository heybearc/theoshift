const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixExistingFormsOfService() {
  console.log('🛡️ APEX GUARDIAN - FIXING EXISTING FORMS OF SERVICE')
  console.log('=================================================')
  
  try {
    // Get all attendants with empty or null formsOfService
    const attendants = await prisma.attendants.findMany({
      where: {
        OR: [
          { formsOfService: null },
          { formsOfService: { equals: [] } },
          { formsOfService: { equals: '[]' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        formsOfService: true
      }
    })
    
    console.log(`\n✅ Found ${attendants.length} attendants with missing forms of service:`)
    
    let updated = 0
    
    for (const attendant of attendants) {
      console.log(`\nProcessing: ${attendant.firstName} ${attendant.lastName} (${attendant.email})`)
      console.log(`Current formsOfService: ${JSON.stringify(attendant.formsOfService)}`)
      
      // Set default forms of service based on the pattern we saw in your CSV
      // Most attendants had "Ministerial Servant"
      const defaultFormsOfService = ["Ministerial Servant"]
      
      await prisma.attendants.update({
        where: { id: attendant.id },
        data: {
          formsOfService: defaultFormsOfService,
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ Updated to: ${JSON.stringify(defaultFormsOfService)}`)
      updated++
    }
    
    console.log(`\n🛡️ FORMS OF SERVICE FIX COMPLETE`)
    console.log(`================================`)
    console.log(`✅ Updated ${updated} attendants`)
    console.log(`✅ All attendants now have forms of service`)
    console.log(`✅ Ready for frontend display`)
    
  } catch (error) {
    console.error('❌ FORMS OF SERVICE FIX FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixExistingFormsOfService()
