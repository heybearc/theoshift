#!/usr/bin/env node

/**
 * Attendant Migration Analysis Script
 * 
 * This script analyzes the current database state to prepare for
 * the attendant table consolidation migration.
 * 
 * SAFE TO RUN - This script only reads data, makes no changes.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Analyzing Attendant Migration Requirements')
  console.log('============================================')
  
  try {
    // Step 1: Current table counts
    console.log('\n📊 Current Database State:')
    console.log('---------------------------')
    
    const attendantsCount = await prisma.attendants.count()
    const eventAttendeesCount = await prisma.event_attendants.count()
    const assignmentsCount = await prisma.position_assignments.count()
    const oversightCount = await prisma.position_oversight_assignments.count()
    const publicationsCount = await prisma.document_publications.count()
    
    console.log(`- Attendants (global): ${attendantsCount}`)
    console.log(`- Event Attendants: ${eventAttendeesCount}`)
    console.log(`- Position Assignments: ${assignmentsCount}`)
    console.log(`- Oversight Assignments: ${oversightCount}`)
    console.log(`- Document Publications: ${publicationsCount}`)
    
    // Step 2: Relationship analysis
    console.log('\n🔗 Relationship Analysis:')
    console.log('--------------------------')
    
    // Check event_attendants with valid attendant references
    const validEventAttendants = await prisma.event_attendants.count({
      where: {
        attendants: { isNot: null }
      }
    })
    
    const orphanedEventAttendants = eventAttendeesCount - validEventAttendants
    
    console.log(`- Event attendants with valid attendant reference: ${validEventAttendants}`)
    console.log(`- Orphaned event attendants: ${orphanedEventAttendants}`)
    
    // Check assignments referencing attendants
    const assignmentsWithAttendants = await prisma.position_assignments.count({
      where: {
        attendant: { isNot: null }
      }
    })
    
    console.log(`- Position assignments with attendant reference: ${assignmentsWithAttendants}`)
    
    // Step 3: Data integrity checks
    console.log('\n✅ Data Integrity Checks:')
    console.log('--------------------------')
    
    // Check for duplicate emails in attendants
    const attendantsWithEmails = await prisma.attendants.groupBy({
      by: ['email'],
      _count: { email: true }
    })
    
    const duplicateEmails = attendantsWithEmails.filter(group => group._count.email > 1)
    
    if (duplicateEmails.length > 0) {
      console.log(`⚠️  Found ${duplicateEmails.length} duplicate email addresses in attendants`)
      duplicateEmails.forEach(dup => {
        console.log(`   - ${dup.email}: ${dup._count.email} records`)
      })
    } else {
      console.log('✅ No duplicate emails found in attendants table')
    }
    
    // Check for attendants without event associations
    const attendantsWithoutEvents = await prisma.attendants.count({
      where: {
        event_attendants: {
          none: {}
        }
      }
    })
    
    if (attendantsWithoutEvents > 0) {
      console.log(`⚠️  Found ${attendantsWithoutEvents} attendants not associated with any events`)
    } else {
      console.log('✅ All attendants are associated with events')
    }
    
    // Step 4: Migration impact assessment
    console.log('\n📋 Migration Impact Assessment:')
    console.log('-------------------------------')
    
    // Calculate expected event_attendants after migration
    const eventsWithAttendants = await prisma.event_attendants.findMany({
      include: {
        attendants: true,
        events: { select: { name: true } }
      }
    })
    
    const eventBreakdown = {}
    eventsWithAttendants.forEach(ea => {
      const eventName = ea.events.name
      if (!eventBreakdown[eventName]) {
        eventBreakdown[eventName] = 0
      }
      eventBreakdown[eventName]++
    })
    
    console.log('Event attendant distribution:')
    Object.entries(eventBreakdown).forEach(([eventName, count]) => {
      console.log(`   - ${eventName}: ${count} attendants`)
    })
    
    // Step 5: Required schema changes
    console.log('\n🔧 Required Schema Changes:')
    console.log('---------------------------')
    
    console.log('✅ Add columns to event_attendants:')
    console.log('   - firstName, lastName, email, phone, congregation')
    console.log('   - isAvailable, availabilityStatus, formsOfService')
    console.log('   - servingAs, skills, preferredDepartments')
    console.log('   - unavailableDates, pinHash, profileVerificationRequired')
    console.log('   - profileVerifiedAt, totalAssignments, totalHours, notes')
    
    console.log('\n✅ Update foreign key references:')
    console.log('   - position_assignments.attendantId → event_attendants.id')
    console.log('   - position_assignments.keymanId → event_attendants.id')
    console.log('   - position_assignments.overseerId → event_attendants.id')
    console.log('   - position_oversight_assignments.overseer_id → event_attendants.id')
    console.log('   - position_oversight_assignments.keyman_id → event_attendants.id')
    console.log('   - document_publications.attendantId → event_attendants.id')
    
    console.log('\n✅ Remove after migration:')
    console.log('   - attendants table (after thorough testing)')
    console.log('   - event_attendants.attendantId column')
    console.log('   - event_attendants.keymanId column')
    console.log('   - event_attendants.overseerId column')
    
    // Step 6: Migration readiness
    console.log('\n🚦 Migration Readiness:')
    console.log('-----------------------')
    
    let readinessScore = 0
    const checks = []
    
    if (attendantsCount > 0) {
      checks.push('✅ Attendants table has data to migrate')
      readinessScore++
    } else {
      checks.push('⚠️  Attendants table is empty - migration may not be needed')
    }
    
    if (orphanedEventAttendants === 0) {
      checks.push('✅ No orphaned event_attendants records')
      readinessScore++
    } else {
      checks.push(`⚠️  ${orphanedEventAttendants} orphaned event_attendants need cleanup`)
    }
    
    if (duplicateEmails.length === 0) {
      checks.push('✅ No duplicate emails in attendants')
      readinessScore++
    } else {
      checks.push(`❌ ${duplicateEmails.length} duplicate emails need resolution`)
    }
    
    if (assignmentsWithAttendants > 0) {
      checks.push('✅ Position assignments reference attendants')
      readinessScore++
    }
    
    checks.forEach(check => console.log(check))
    
    console.log(`\nReadiness Score: ${readinessScore}/4`)
    
    if (readinessScore >= 3) {
      console.log('🟢 READY FOR MIGRATION')
      console.log('\n📋 Next Steps:')
      console.log('1. Create database backup')
      console.log('2. Run migration script on staging')
      console.log('3. Test all attendant functionality')
      console.log('4. Deploy to production after validation')
    } else {
      console.log('🟡 NEEDS ATTENTION BEFORE MIGRATION')
      console.log('\n⚠️  Address the issues above before proceeding')
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run analysis if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Analysis completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Analysis failed:', error)
      process.exit(1)
    })
}

module.exports = { main }
