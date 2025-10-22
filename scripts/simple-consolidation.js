#!/usr/bin/env node

/**
 * Simple Attendant Consolidation
 * 
 * This script consolidates attendant data using Prisma operations
 * that work within existing database permissions.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Simple Attendant Consolidation')
  console.log('==========================================')
  
  try {
    // Step 1: Analyze current state
    console.log('\n📊 Current State:')
    const attendantsCount = await prisma.attendants.count()
    const eventAttendeesCount = await prisma.event_attendants.count()
    
    console.log(`- Attendants: ${attendantsCount}`)
    console.log(`- Event Attendants: ${eventAttendeesCount}`)
    
    // Step 2: Get all event_attendants with their linked attendant data
    console.log('\n🔄 Fetching attendant data...')
    const eventAttendantsWithData = await prisma.event_attendants.findMany({
      include: {
        attendants: true,
        events: { select: { name: true } }
      }
    })
    
    console.log(`Found ${eventAttendantsWithData.length} event attendants to process`)
    
    // Step 3: Since we can't ALTER TABLE, let's work with what we have
    // We'll update the existing event_attendants records with attendant data
    // by using the existing columns and JSON fields
    
    console.log('\n📝 Consolidating data into existing structure...')
    
    let processed = 0
    for (const eventAttendant of eventAttendantsWithData) {
      if (eventAttendant.attendants) {
        const attendant = eventAttendant.attendants
        
        // Store attendant data in JSON fields that already exist
        const attendantData = {
          firstName: attendant.firstName,
          lastName: attendant.lastName,
          email: attendant.email,
          phone: attendant.phone,
          congregation: attendant.congregation,
          isAvailable: attendant.isAvailable,
          availabilityStatus: attendant.availabilityStatus,
          formsOfService: attendant.formsOfService,
          servingAs: attendant.servingAs,
          skills: attendant.skills,
          preferredDepartments: attendant.preferredDepartments,
          unavailableDates: attendant.unavailableDates,
          pinHash: attendant.pinHash,
          profileVerificationRequired: attendant.profileVerificationRequired,
          profileVerifiedAt: attendant.profileVerifiedAt,
          totalAssignments: attendant.totalAssignments,
          totalHours: attendant.totalHours,
          notes: attendant.notes
        }
        
        // Update event_attendants with consolidated data
        await prisma.event_attendants.update({
          where: { id: eventAttendant.id },
          data: {
            // Store all attendant data in assignedDepartments JSON field temporarily
            assignedDepartments: attendantData
          }
        })
        
        processed++
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed}/${eventAttendantsWithData.length}`)
        }
      }
    }
    
    console.log(`✅ Processed ${processed} event attendants`)
    
    // Step 4: Verification
    console.log('\n🔍 Verifying consolidation...')
    
    const consolidatedCount = await prisma.event_attendants.count({
      where: {
        assignedDepartments: { not: null }
      }
    })
    
    console.log(`- Event attendants with consolidated data: ${consolidatedCount}`)
    
    // Step 5: Show sample of consolidated data
    console.log('\n📋 Sample consolidated data:')
    const sample = await prisma.event_attendants.findFirst({
      where: {
        assignedDepartments: { not: null }
      },
      include: {
        events: { select: { name: true } }
      }
    })
    
    if (sample && sample.assignedDepartments) {
      const data = sample.assignedDepartments
      console.log(`- Event: ${sample.events.name}`)
      console.log(`- Name: ${data.firstName} ${data.lastName}`)
      console.log(`- Email: ${data.email}`)
      console.log(`- Congregation: ${data.congregation}`)
    }
    
    console.log('\n✅ Consolidation completed!')
    console.log('\n📋 Next Steps:')
    console.log('1. The attendant data is now stored in event_attendants.assignedDepartments')
    console.log('2. Update API endpoints to read from this consolidated structure')
    console.log('3. Test all attendant functionality')
    console.log('4. After validation, the attendants table can be removed')
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run consolidation if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Consolidation script completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Consolidation script failed:', error)
      process.exit(1)
    })
}

module.exports = { main }
