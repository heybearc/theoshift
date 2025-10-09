#!/usr/bin/env node

/**
 * CRITICAL MIGRATION SCRIPT: Shift-Specific Assignment Migration
 * 
 * This script migrates existing position_assignments that don't have shiftId
 * to the new shift-specific architecture by creating default shifts and linking them.
 * 
 * MUST RUN BEFORE DEPLOYING SHIFT-SPECIFIC CHANGES
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function migrateAssignmentsToShifts() {
  console.log('🔄 Starting Assignment-to-Shift Migration...')
  
  try {
    // Step 1: Find all assignments without shiftId
    const assignmentsWithoutShifts = await prisma.position_assignments.findMany({
      where: { shiftId: null },
      include: {
        position: true,
        attendant: true
      }
    })
    
    console.log(`📊 Found ${assignmentsWithoutShifts.length} assignments without shifts`)
    
    if (assignmentsWithoutShifts.length === 0) {
      console.log('✅ No migration needed - all assignments already have shifts')
      return
    }
    
    // Step 2: Group assignments by position
    const assignmentsByPosition = new Map()
    assignmentsWithoutShifts.forEach(assignment => {
      const positionId = assignment.positionId
      if (!assignmentsByPosition.has(positionId)) {
        assignmentsByPosition.set(positionId, [])
      }
      assignmentsByPosition.get(positionId).push(assignment)
    })
    
    console.log(`📍 Processing ${assignmentsByPosition.size} positions`)
    
    let totalShiftsCreated = 0
    let totalAssignmentsUpdated = 0
    
    // Step 3: Process each position
    for (const [positionId, assignments] of assignmentsByPosition) {
      const position = assignments[0].position
      console.log(`\n🎯 Processing position: ${position.name} (${assignments.length} assignments)`)
      
      // Check if position already has shifts
      const existingShifts = await prisma.position_shifts.findMany({
        where: { positionId: positionId }
      })
      
      let defaultShift
      
      if (existingShifts.length === 0) {
        // Create a default "All Day" shift for this position
        console.log(`  📅 Creating default shift for position ${position.name}`)
        
        defaultShift = await prisma.position_shifts.create({
          data: {
            id: crypto.randomUUID(),
            positionId: positionId,
            name: 'All Day',
            startTime: null,
            endTime: null,
            isAllDay: true,
            sequence: 1
          }
        })
        
        totalShiftsCreated++
        console.log(`  ✅ Created default shift: ${defaultShift.id}`)
      } else {
        // Use the first existing shift
        defaultShift = existingShifts[0]
        console.log(`  📋 Using existing shift: ${defaultShift.name}`)
      }
      
      // Step 4: Update all assignments for this position to use the default shift
      for (const assignment of assignments) {
        await prisma.position_assignments.update({
          where: { id: assignment.id },
          data: { shiftId: defaultShift.id }
        })
        
        totalAssignmentsUpdated++
        console.log(`  ✅ Updated assignment: ${assignment.attendant.firstName} ${assignment.attendant.lastName}`)
      }
    }
    
    console.log('\n🎉 Migration Complete!')
    console.log(`📊 Summary:`)
    console.log(`   • Shifts Created: ${totalShiftsCreated}`)
    console.log(`   • Assignments Updated: ${totalAssignmentsUpdated}`)
    console.log(`   • Positions Processed: ${assignmentsByPosition.size}`)
    
    // Step 5: Verification
    const remainingNullShifts = await prisma.position_assignments.count({
      where: { shiftId: null }
    })
    
    if (remainingNullShifts === 0) {
      console.log('✅ VERIFICATION PASSED: All assignments now have shifts')
    } else {
      console.log(`❌ VERIFICATION FAILED: ${remainingNullShifts} assignments still without shifts`)
      throw new Error('Migration incomplete')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateAssignmentsToShifts()
    .then(() => {
      console.log('🚀 Migration script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error)
      process.exit(1)
    })
}

module.exports = { migrateAssignmentsToShifts }
