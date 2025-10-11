const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeAssignments() {
  const eventId = 'd43d977b-c06e-446f-8c6d-05b407daf459'
  
  console.log('🔍 ASSIGNMENT ANALYSIS REPORT')
  console.log('=' .repeat(50))
  
  try {
    // Get all event attendants with their oversight
    const eventAttendants = await prisma.event_attendant_associations.findMany({
      where: { eventId },
      include: {
        attendants: {
          include: {
            overseer: true,
            keyman: true
          }
        }
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
        attendant: {
          include: {
            overseer_assignments: true,
            keyman_assignments: true
          }
        },
        position: {
          include: {
            oversight: {
              include: {
                overseer: true,
                keyman: true
              }
            }
          }
        },
        shift: true
      }
    })
    
    console.log(`📊 SUMMARY:`)
    console.log(`   Total Event Attendants: ${eventAttendants.length}`)
    console.log(`   Total Assignments Made: ${assignments.length}`)
    console.log('')
    
    // Group attendants by oversight
    const attendantsByOversight = new Map()
    const excludedAttendants = []
    
    eventAttendants.forEach(assoc => {
      const attendant = assoc.attendants
      
      // Skip overseers and keymen
      const isOverseer = eventAttendants.some(a => a.attendants.overseerId === attendant.id)
      const isKeyman = eventAttendants.some(a => a.attendants.keymanId === attendant.id)
      
      if (isOverseer || isKeyman) {
        excludedAttendants.push(`${attendant.firstName} ${attendant.lastName} (${isOverseer ? 'Overseer' : 'Keyman'})`)
        return
      }
      
      const overseerId = attendant.overseerId || 'none'
      const keymanId = attendant.keymanId || 'none'
      const oversightKey = `${overseerId}-${keymanId}`
      
      if (!attendantsByOversight.has(oversightKey)) {
        attendantsByOversight.set(oversightKey, {
          overseer: attendant.overseer?.firstName + ' ' + attendant.overseer?.lastName || 'None',
          keyman: attendant.keyman?.firstName + ' ' + attendant.keyman?.lastName || 'None',
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
          return a.shift.startTime.localeCompare(b.shift.startTime)
        })
        
        // Check for time overlaps
        for (let i = 0; i < sortedAssignments.length - 1; i++) {
          const current = sortedAssignments[i]
          const next = sortedAssignments[i + 1]
          
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
        console.log(`   ${last.shift.name} (${last.shift.startTime}-${last.shift.endTime}) -> ${last.position.name}`)
        console.log('')
      }
    }
    
    console.log(`📊 TOTAL CONFLICTS FOUND: ${conflictCount}`)
    console.log('')
    
    // Check oversight matching
    console.log(`🎯 OVERSIGHT MATCHING ANALYSIS:`)
    console.log('-'.repeat(50))
    
    let perfectMatches = 0
    let mismatchedAssignments = 0
    
    assignments.forEach(assignment => {
      const attendant = assignment.attendant
      const position = assignment.position
      const positionOversight = position.oversight?.[0]
      
      const attendantOverseerId = attendant.overseerId
      const attendantKeymanId = attendant.keymanId
      const positionOverseerId = positionOversight?.overseerId
      const positionKeymanId = positionOversight?.keymanId
      
      const isMatch = (attendantOverseerId === positionOverseerId) && (attendantKeymanId === positionKeymanId)
      
      if (isMatch) {
        perfectMatches++
      } else {
        mismatchedAssignments++
        console.log(`⚠️  MISMATCH: ${attendant.firstName} ${attendant.lastName} -> ${position.name}`)
        console.log(`   Attendant: ${attendant.overseer?.firstName || 'None'} / ${attendant.keyman?.firstName || 'None'}`)
        console.log(`   Position: ${positionOversight?.overseer?.firstName || 'None'} / ${positionOversight?.keyman?.firstName || 'None'}`)
      }
    })
    
    console.log(`✅ Perfect Matches: ${perfectMatches}`)
    console.log(`⚠️  Mismatched: ${mismatchedAssignments}`)
    console.log('')
    
    // Summary
    console.log(`📋 FINAL SUMMARY:`)
    console.log('='.repeat(50))
    console.log(`✅ Total Assignments: ${assignments.length}`)
    console.log(`👥 Attendants Used: ${assignedAttendantIds.size}`)
    console.log(`⚠️  Attendants Unused: ${totalUnused}`)
    console.log(`🎯 Perfect Oversight Matches: ${perfectMatches}`)
    console.log(`⚠️  Oversight Mismatches: ${mismatchedAssignments}`)
    console.log(`🚨 Time Conflicts: ${conflictCount}`)
    
    const successRate = assignments.length > 0 ? Math.round((perfectMatches / assignments.length) * 100) : 0
    console.log(`📊 Oversight Success Rate: ${successRate}%`)
    
  } catch (error) {
    console.error('Error analyzing assignments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeAssignments()
