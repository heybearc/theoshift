const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeAssignments() {
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459'
  
  console.log('🔍 ASSIGNMENT ANALYSIS REPORT')
  console.log('=' .repeat(50))
  
  try {
    // Get all event attendants
    const eventAttendants = await prisma.event_attendant_associations.findMany({
      where: { eventId },
      include: {
        attendants: true,
        overseer: true,
        keyman: true
      }
    })
    
    // Get all assignments for this event
    const assignments = await prisma.position_assignments.findMany({
      where: {
        position: {
          eventId: eventId
        }
      },
      include: {
        attendant: true,
        position: true,
        shift: true
      }
    })
    
    console.log(`📊 SUMMARY:`)
    console.log(`   Total Event Attendants: ${eventAttendants.length}`)
    console.log(`   Total Assignments Made: ${assignments.length}`)
    console.log('')
    
    // Group attendants by oversight (from event associations)
    const attendantsByOversight = new Map()
    const excludedAttendants = []
    
    eventAttendants.forEach(assoc => {
      const attendant = assoc.attendants
      if (!attendant) return
      
      // Skip overseers and keymen (check if they are referenced as overseer/keyman)
      const isOverseer = eventAttendants.some(a => a.overseerId === attendant.id)
      const isKeyman = eventAttendants.some(a => a.keymanId === attendant.id)
      
      if (isOverseer || isKeyman) {
        excludedAttendants.push(`${attendant.firstName} ${attendant.lastName} (${isOverseer ? 'Overseer' : 'Keyman'})`)
        return
      }
      
      const overseerId = assoc.overseerId || 'none'
      const keymanId = assoc.keymanId || 'none'
      const oversightKey = `${overseerId}-${keymanId}`
      
      if (!attendantsByOversight.has(oversightKey)) {
        attendantsByOversight.set(oversightKey, {
          overseer: assoc.overseer?.firstName + ' ' + assoc.overseer?.lastName || 'None',
          keyman: assoc.keyman?.firstName + ' ' + assoc.keyman?.lastName || 'None',
          attendants: []
        })
      }
      
      attendantsByOversight.get(oversightKey).attendants.push(attendant)
    })
    
    console.log(`🚫 EXCLUDED FROM ASSIGNMENTS (${excludedAttendants.length}):`)
    excludedAttendants.forEach(name => console.log(`   - ${name}`))
    console.log('')
    
    // Analyze utilization by oversight group
    console.log(`👥 UTILIZATION BY OVERSIGHT GROUP:`)
    console.log('-'.repeat(50))
    
    const assignedAttendantIds = new Set(assignments.map(a => a.attendantId))
    let totalUnused = 0
    
    for (const [oversightKey, group] of attendantsByOversight) {
      const totalInGroup = group.attendants.length
      const assignedInGroup = group.attendants.filter(a => assignedAttendantIds.has(a.id)).length
      const unusedInGroup = totalInGroup - assignedInGroup
      totalUnused += unusedInGroup
      
      console.log(`📋 ${group.overseer} / ${group.keyman}:`)
      console.log(`   Total: ${totalInGroup}, Assigned: ${assignedInGroup}, Unused: ${unusedInGroup}`)
      
      if (unusedInGroup > 0) {
        const unused = group.attendants.filter(a => !assignedAttendantIds.has(a.id))
        console.log(`   ⚠️  Unused: ${unused.map(a => `${a.firstName} ${a.lastName}`).join(', ')}`)
      }
      console.log('')
    }
    
    console.log(`📊 TOTAL UNUSED ATTENDANTS: ${totalUnused}`)
    console.log('')
    
    // Check for conflicts (same attendant, overlapping times)
    console.log(`🚨 CONFLICT ANALYSIS:`)
    console.log('-'.repeat(50))
    
    const attendantAssignments = new Map()
    assignments.forEach(assignment => {
      const attendantId = assignment.attendantId
      if (!attendantAssignments.has(attendantId)) {
        attendantAssignments.set(attendantId, [])
      }
      attendantAssignments.get(attendantId).push(assignment)
    })
    
    let conflictCount = 0
    
    for (const [attendantId, attendantAssignmentList] of attendantAssignments) {
      if (attendantAssignmentList.length > 1) {
        const attendant = attendantAssignmentList[0].attendant
        console.log(`👤 ${attendant.firstName} ${attendant.lastName} (${attendantAssignmentList.length} assignments):`)
        
        // Sort by start time
        const sortedAssignments = attendantAssignmentList.sort((a, b) => {
          if (!a.shift || !b.shift) return 0
          return a.shift.startTime.localeCompare(b.shift.startTime)
        })
        
        // Check for time overlaps
        for (let i = 0; i < sortedAssignments.length - 1; i++) {
          const current = sortedAssignments[i]
          const next = sortedAssignments[i + 1]
          
          if (!current.shift || !next.shift) continue
          
          const currentEnd = current.shift.endTime
          const nextStart = next.shift.startTime
          
          console.log(`   ${current.shift.name} (${current.shift.startTime}-${currentEnd}) -> ${current.position.name}`)
          
          if (currentEnd > nextStart) {
            console.log(`   🚨 CONFLICT: Overlaps with next shift!`)
            conflictCount++
          }
        }
        
        // Print last assignment
        const last = sortedAssignments[sortedAssignments.length - 1]
        if (last.shift) {
          console.log(`   ${last.shift.name} (${last.shift.startTime}-${last.shift.endTime}) -> ${last.position.name}`)
        }
        console.log('')
      }
    }
    
    console.log(`📊 TOTAL CONFLICTS FOUND: ${conflictCount}`)
    console.log('')
    
    // Summary
    console.log(`📋 FINAL SUMMARY:`)
    console.log('='.repeat(50))
    console.log(`✅ Total Assignments: ${assignments.length}`)
    console.log(`👥 Attendants Used: ${assignedAttendantIds.size}`)
    console.log(`⚠️  Attendants Unused: ${totalUnused}`)
    console.log(`🚨 Time Conflicts: ${conflictCount}`)
    
    // Show assignment distribution
    console.log('')
    console.log(`📊 ASSIGNMENT DISTRIBUTION:`)
    console.log('-'.repeat(30))
    
    const assignmentCounts = new Map()
    for (const [attendantId, assignmentList] of attendantAssignments) {
      const count = assignmentList.length
      if (!assignmentCounts.has(count)) {
        assignmentCounts.set(count, 0)
      }
      assignmentCounts.set(count, assignmentCounts.get(count) + 1)
    }
    
    for (const [count, attendants] of [...assignmentCounts.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`   ${attendants} attendants with ${count} assignment${count > 1 ? 's' : ''}`)
    }
    
  } catch (error) {
    console.error('Error analyzing assignments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeAssignments()
