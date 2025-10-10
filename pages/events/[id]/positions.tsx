import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import BulkPositionCreator from '../../../components/BulkPositionCreator'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../api/auth/[...nextauth]'
import crypto from 'crypto'

// Utility function to convert 24-hour time to 12-hour format
function formatTime12Hour(time24: string): string {
  if (!time24) return ''
  
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  
  return `${hour12}:${minutes} ${ampm}`
}

// APEX GUARDIAN: Modern Event Positions Management Page
// Updated to use the new positions API with bulk creation capabilities

interface Position {
  id: string
  positionNumber: number
  name: string
  positionName: string
  description?: string
  area?: string
  sequence: number
  isActive: boolean
  overseerId?: string | null
  keymanId?: string | null
  shifts?: Array<{
    id: string
    name: string
    startTime?: string
    endTime?: string
    isAllDay: boolean
  }>
  assignments?: Array<{
    id: string
    role: string
    attendant: {
      id: string
      firstName: string
      lastName: string
    }
    overseer?: {
      id: string
      firstName: string
      lastName: string
    }
    keyman?: {
      id: string
      firstName: string
      lastName: string
    }
    shift?: {
      id: string
      name: string
      startTime?: string
      endTime?: string
      isAllDay: boolean
    }
  }>
  oversight?: Array<{
    id: string
    overseer?: {
      id: string
      firstName: string
      lastName: string
    }
    keyman?: {
      id: string
      firstName: string
      lastName: string
    }
  }>
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface Stats {
  total: number
  active: number
  assigned: number
}

interface Attendant {
  id: string
  firstName: string
  lastName: string
  role: string
  formsOfService: string[] | string
  congregation?: string
  isActive: boolean
  overseerId?: string | null
  keymanId?: string | null
}

interface EventPositionsProps {
  eventId: string
  event: Event
  positions: Position[]
  attendants: Attendant[]
  stats: Stats
}

export default function EventPositionsPage({ eventId, event, positions, attendants, stats }: EventPositionsProps) {
  const router = useRouter()
  
  // Attendants data loaded via SSR
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showOverseerModal, setShowOverseerModal] = useState(false)
  const [showBulkCreator, setShowBulkCreator] = useState(false)
  const [showAssignAttendantModal, setShowAssignAttendantModal] = useState(false)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedShift, setSelectedShift] = useState<any | null>(null)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [bulkCreateResults, setBulkCreateResults] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set())
  const [showInactive, setShowInactive] = useState(false)

  // Initialize showInactive state from URL or localStorage on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const showInactiveParam = urlParams.get('showInactive')
    
    if (showInactiveParam === 'true') {
      setShowInactive(true)
    } else {
      // Check localStorage as fallback
      const savedState = localStorage.getItem(`showInactive-event-${eventId}`)
      if (savedState === 'true') {
        setShowInactive(true)
      }
    }
  }, [eventId])
  const [shiftFormData, setShiftFormData] = useState({
    startTime: '',
    endTime: '',
    isAllDay: false
  })
  const [overseerFormData, setOverseerFormData] = useState({
    overseerId: '',
    keymanId: '',
    responsibilities: ''
  })
  const [formData, setFormData] = useState({
    positionNumber: 1,
    name: '',
    area: '',
    description: ''
  })

  // APEX GUARDIAN: Client-side fetching removed - data now provided via SSR

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Position name is required')
      return
    }

    try {
      const url = editingPosition 
        ? `/api/events/${eventId}/positions/${editingPosition.id}`
        : `/api/events/${eventId}/positions`
      
      const method = editingPosition ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert(editingPosition ? 'Position updated successfully' : 'Position created successfully')
        setShowCreateModal(false)
        setEditingPosition(null)
        setFormData({ positionNumber: 1, name: '', area: '', description: '' })
        reloadWithState() // Refresh page to show updated data
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save position')
      }
    } catch (error) {
      console.error('Error saving position:', error)
      alert('Failed to save position')
    }
  }

  const handleEdit = (position: Position) => {
    setEditingPosition(position)
    setFormData({
      positionNumber: position.positionNumber,
      name: position.name,
      area: position.area || '',
      description: position.description || ''
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (positionId: string) => {
    if (!confirm(`Are you sure you want to deactivate this position? It can be reactivated later.`)) {
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/events/${eventId}/positions/${positionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        reloadWithState()
      } else {
        const error = await response.json()
        alert(`Failed to deactivate position: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to deactivate position')
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingPosition(null)
    setFormData({ positionNumber: 1, name: '', area: '', description: '' })
  }

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPosition) return
    
    // APEX GUARDIAN: Bidirectional shift logic validation
    if (shiftFormData.isAllDay && selectedPosition.shifts && selectedPosition.shifts.length > 0) {
      const hasPartialShifts = selectedPosition.shifts.some(shift => !shift.isAllDay)
      if (hasPartialShifts) {
        alert(
          '❌ Cannot add All Day shift\n\n' +
          'This position already has partial shifts. An All Day shift covers the entire 24-hour period and conflicts with existing partial shifts.\n\n' +
          'Please delete existing partial shifts first, then add the All Day shift.'
        )
        return
      }
    }
    
    try {
      const response = await fetch(`/api/events/${eventId}/positions/${selectedPosition.id}/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          startTime: shiftFormData.startTime,
          endTime: shiftFormData.endTime,
          isAllDay: shiftFormData.isAllDay,
          positionId: selectedPosition.id
        }),
      })

      if (response.ok) {
        alert('✅ Shift added successfully')
        setShowShiftModal(false)
        setShiftFormData({ startTime: '', endTime: '', isAllDay: false })
        router.reload()
      } else {
        const error = await response.json()
        alert(`Failed to add shift: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error adding shift:', error)
      alert('Failed to add shift')
    }
  }

  const handleOverseerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPosition) return
    
    try {
      const response = await fetch(`/api/events/${eventId}/positions/${selectedPosition.id}/overseer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          overseerId: overseerFormData.overseerId,
          keymanId: overseerFormData.keymanId || null,
          responsibilities: overseerFormData.responsibilities,
          positionId: selectedPosition.id
        }),
      })

      if (response.ok) {
        alert('Overseer assigned successfully')
        setShowOverseerModal(false)
        setOverseerFormData({ overseerId: '', keymanId: '', responsibilities: '' })
        router.reload()
      } else {
        const error = await response.json()
        alert(`Failed to assign overseer: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error assigning overseer:', error)
      alert('Failed to assign overseer')
    }
  }

  const handleBulkCreateSuccess = (result: any) => {
    alert(`Successfully created ${result.created} positions`)
    setShowBulkCreator(false)
    reloadWithState() // Refresh page to show updated data
  }

  // APEX GUARDIAN: New Separated Bulk Operation Handlers
  
  // Handle bulk position updates (area, status)
  const handleBulkPositionUpdate = async () => {
    try {
      setIsSubmitting(true)
      const area = (document.getElementById('bulk-area') as HTMLInputElement)?.value
      const isActive = (document.getElementById('bulk-status') as HTMLSelectElement)?.value
      
      if (!area && isActive === '') {
        alert('Please specify at least one field to update')
        return
      }
      
      let successCount = 0
      for (const positionId of selectedPositions) {
        const updateData: any = {}
        if (area) updateData.area = area
        if (isActive !== '') updateData.isActive = isActive === 'true'
        
        const response = await fetch(`/api/events/${eventId}/positions/${positionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        if (response.ok) {
          successCount++
        } else {
          console.error(`Failed to update position ${positionId}`)
        }
      }
      
      alert(`✅ Successfully updated ${successCount} of ${selectedPositions.size} positions`)
      reloadWithState()
    } catch (error) {
      console.error('Bulk position update error:', error)
      alert('Failed to update positions')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle bulk template application
  const handleBulkTemplateApplication = async () => {
    try {
      setIsSubmitting(true)
      const templateType = (document.getElementById('bulk-template') as HTMLSelectElement)?.value
      
      if (!templateType) {
        alert('Please select a template')
        return
      }
      
      // APEX GUARDIAN: Bidirectional shift logic validation for All Day template
      if (templateType === 'allday') {
        const selectedPositionObjects = positions.filter(p => selectedPositions.has(p.id))
        const positionsWithPartialShifts = selectedPositionObjects.filter(position => 
          position.shifts && position.shifts.some(shift => !shift.isAllDay)
        )
        
        if (positionsWithPartialShifts.length > 0) {
          const positionNames = positionsWithPartialShifts.map(p => p.name).join(', ')
          alert(
            '❌ Cannot apply All Day template to some positions\n\n' +
            `The following positions have partial shifts that conflict with All Day shifts:\n${positionNames}\n\n` +
            'Please delete existing partial shifts from these positions first, then apply the All Day template.'
          )
          return
        }
      }
      
      const response = await fetch(`/api/events/${eventId}/positions/apply-shift-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionIds: Array.from(selectedPositions),
          templateType: templateType
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ Template Applied Successfully!\n\n` +
              `• Positions: ${result.data.positionsProcessed}\n` +
              `• Shifts Created: ${result.data.totalShiftsCreated}\n` +
              `• Template: ${result.data.templateType}`)
        reloadWithState()
      } else {
        const error = await response.json()
        alert(`Failed to apply template: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Template application error:', error)
      alert('Failed to apply template')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle bulk custom shift creation
  const handleBulkCustomShiftCreation = async () => {
    try {
      setIsSubmitting(true)
      const shiftName = (document.getElementById('bulk-shift-name') as HTMLInputElement)?.value
      const shiftStart = (document.getElementById('bulk-shift-start') as HTMLInputElement)?.value
      const shiftEnd = (document.getElementById('bulk-shift-end') as HTMLInputElement)?.value
      const isAllDay = (document.getElementById('bulk-shift-allday') as HTMLInputElement)?.checked
      
      if (!isAllDay && (!shiftStart || !shiftEnd)) {
        alert('Please specify start and end times, or check "All Day"')
        return
      }
      
      if (!shiftName) {
        alert('Please specify a shift name')
        return
      }
      
      // APEX GUARDIAN: Bidirectional shift logic validation for bulk operations
      if (isAllDay) {
        const selectedPositionObjects = positions.filter(p => selectedPositions.has(p.id))
        const positionsWithPartialShifts = selectedPositionObjects.filter(position => 
          position.shifts && position.shifts.some(shift => !shift.isAllDay)
        )
        
        if (positionsWithPartialShifts.length > 0) {
          const positionNames = positionsWithPartialShifts.map(p => p.name).join(', ')
          alert(
            '❌ Cannot add All Day shift to some positions\n\n' +
            `The following positions have partial shifts that conflict with All Day shifts:\n${positionNames}\n\n` +
            'Please delete existing partial shifts from these positions first, then add the All Day shift.'
          )
          return
        }
      }
      
      let successCount = 0
      for (const positionId of selectedPositions) {
        const response = await fetch(`/api/events/${eventId}/positions/${positionId}/shifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: shiftName,
            startTime: isAllDay ? null : shiftStart,
            endTime: isAllDay ? null : shiftEnd,
            isAllDay: isAllDay
          })
        })
        
        if (response.ok) {
          successCount++
        } else {
          console.error(`Failed to create shift for position ${positionId}`)
        }
      }
      
      alert(`✅ Successfully created "${shiftName}" shift for ${successCount} of ${selectedPositions.size} positions`)
      reloadWithState()
    } catch (error) {
      console.error('Custom shift creation error:', error)
      alert('Failed to create shifts')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle bulk oversight assignment using new API
  const handleBulkOversightAssignment = async () => {
    try {
      setIsSubmitting(true)
      const overseerId = (document.getElementById('bulk-overseer') as HTMLSelectElement)?.value
      const keymanId = (document.getElementById('bulk-keyman') as HTMLSelectElement)?.value
      
      if (!overseerId && !keymanId) {
        alert('Please select at least one oversight role to assign')
        return
      }
      
      const response = await fetch(`/api/events/${eventId}/positions/bulk-oversight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionIds: Array.from(selectedPositions),
          overseerId: overseerId || undefined,
          keymanId: keymanId || undefined
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ Oversight Assigned Successfully!\n\n` +
              `• Positions: ${result.data.summary.positionsProcessed}\n` +
              `• No shift dependency required`)
        reloadWithState()
      } else {
        const error = await response.json()
        alert(`Failed to assign oversight: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Bulk oversight assignment error:', error)
      alert('Failed to assign oversight')
    } finally {
      setIsSubmitting(false)
    }
  }

  // APEX GUARDIAN: Handle individual shift deletion
  const handleDeleteShift = async (positionId: string, shiftId: string, shiftName: string) => {
    if (!confirm(`Delete "${shiftName}" shift? This will also remove any attendant assignments to this shift.`)) {
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/positions/${positionId}/shifts/${shiftId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert(`✅ "${shiftName}" shift deleted successfully`)
        reloadWithState()
      } else {
        const error = await response.json()
        alert(`Failed to delete shift: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Delete shift error:', error)
      alert('Failed to delete shift')
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedPositions.size} selected positions? This action cannot be undone.`)) {
      return
    }

    try {
      setIsSubmitting(true)
      let successCount = 0
      let errorCount = 0

      for (const positionId of selectedPositions) {
        try {
          const response = await fetch(`/api/events/${eventId}/positions/${positionId}`, {
            method: 'DELETE',
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
            console.error(`Failed to delete position ${positionId}`)
          }
        } catch (error) {
          errorCount++
          console.error(`Error deleting position ${positionId}:`, error)
        }
      }

      if (successCount > 0) {
        alert(`Successfully deleted ${successCount} position(s)${errorCount > 0 ? `. ${errorCount} failed.` : ''}`)
        setSelectedPositions(new Set())
        reloadWithState()
      } else {
        alert('Failed to delete positions')
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert('Failed to delete positions')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle removing an assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return
    
    try {
      const response = await fetch(`/api/events/${eventId}/assignments/${assignmentId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        router.reload() // Refresh to show updated assignments
      } else {
        alert('Failed to remove assignment')
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
      alert('Failed to remove assignment')
    }
  }

  // Auto-assign algorithm
  const handleAutoAssign = async () => {
    if (!confirm('Auto-assign available attendants to unfilled positions?')) return
    
    try {
      setIsSubmitting(true)
      
      // HIERARCHY-BASED AUTO-ASSIGN ALGORITHM
      console.log('🎯 Starting Hierarchy-Based Auto-Assign...')
      
      // Get all assigned attendant IDs and leadership IDs to avoid double assignments
      const assignedAttendantIds = new Set()
      const leadershipAttendantIds = new Set()
      
      positions.forEach(position => {
        position.assignments?.forEach(assignment => {
          if (assignment.attendant?.id) {
            assignedAttendantIds.add(assignment.attendant.id)
          }
          // Track overseers and keymen separately
          if (assignment.overseer?.id) {
            leadershipAttendantIds.add(assignment.overseer.id)
          }
          if (assignment.keyman?.id) {
            leadershipAttendantIds.add(assignment.keyman.id)
          }
        })
      })
      
      // Find available attendants (not already assigned and not in leadership roles)
      const availableAttendants = attendants.filter(att => 
        att.isActive && 
        !assignedAttendantIds.has(att.id) && 
        !leadershipAttendantIds.has(att.id)
      )
      
      // Group attendants by their leadership (overseer/keyman)
      // APEX GUARDIAN: Attendants don't have direct oversight - they inherit from positions
      // For now, put all available attendants in a general pool
      const attendantsByLeadership = new Map()
      attendantsByLeadership.set('general-pool', [...availableAttendants])
      
      console.log(`👥 Available attendants for assignment: ${availableAttendants.length}`)
      
      // Group positions by their leadership (overseer/keyman) 
      const positionsByLeadership = new Map()
      const positionsNeedingAttendants = positions.filter(pos => 
        pos.isActive && (pos.assignments?.length || 0) < 2
      )
      
      positionsNeedingAttendants.forEach(position => {
        // APEX GUARDIAN: Get oversight from position.oversight array
        const oversight = position.oversight && position.oversight.length > 0 ? position.oversight[0] : null
        const overseerId = oversight?.overseer?.id || 'none'
        const keymanId = oversight?.keyman?.id || 'none'
        const leadershipKey = `${overseerId}-${keymanId}`
        
        if (!positionsByLeadership.has(leadershipKey)) {
          positionsByLeadership.set(leadershipKey, [])
        }
        positionsByLeadership.get(leadershipKey).push(position)
        
        console.log(`📍 Position ${position.positionNumber}: Leadership key = ${leadershipKey}`)
      })
      
      let assignmentCount = 0
      let hierarchyMatches = 0
      let fallbackAssignments = 0
      
      console.log(`📊 Leadership Groups: ${attendantsByLeadership.size} attendant groups, ${positionsByLeadership.size} position groups`)
      
      // Phase 1: Priority assignment to positions with oversight
      const generalPool = attendantsByLeadership.get('general-pool') || []
      const positionsWithOversight: Position[] = []
      const positionsWithoutOversight: Position[] = []
      
      // Separate positions by oversight status
      for (const [leadershipKey, positionsInGroup] of positionsByLeadership) {
        if (leadershipKey === 'none-none') {
          positionsWithoutOversight.push(...positionsInGroup)
        } else {
          positionsWithOversight.push(...positionsInGroup)
        }
      }
      
      console.log(`🎯 Phase 1: Assigning to ${positionsWithOversight.length} positions with oversight`)
      
      // Assign to positions with oversight first
      for (const position of positionsWithOversight) {
        if (generalPool.length === 0) break
        
        const attendant = generalPool.shift()
        if (!attendant) continue
        
        const response = await fetch(`/api/events/${eventId}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionId: position.id,
            attendantId: attendant.id,
            role: 'ATTENDANT'
          })
        })
        
        if (response.ok) {
          assignmentCount++
          hierarchyMatches++
          assignedAttendantIds.add(attendant.id)
          const oversight = position.oversight?.[0]
          const overseerName = oversight?.overseer ? `${oversight.overseer.firstName} ${oversight.overseer.lastName}` : 'None'
          const keymanName = oversight?.keyman ? `${oversight.keyman.firstName} ${oversight.keyman.lastName}` : 'None'
          console.log(`✅ Oversight assignment: ${attendant.firstName} ${attendant.lastName} → ${position.name} (Overseer: ${overseerName}, Keyman: ${keymanName})`)
        }
      }
      
      console.log(`🎯 Phase 2: Assigning to ${positionsWithoutOversight.length} positions without oversight`)
      
      // Then assign to positions without oversight
      for (const position of positionsWithoutOversight) {
        if (generalPool.length === 0) break
        
        const attendant = generalPool.shift()
        if (!attendant) continue
        
        const response = await fetch(`/api/events/${eventId}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionId: position.id,
            attendantId: attendant.id,
            role: 'ATTENDANT'
          })
        })
        
        if (response.ok) {
          assignmentCount++
          hierarchyMatches++
          assignedAttendantIds.add(attendant.id)
          console.log(`✅ General assignment: ${attendant.firstName} ${attendant.lastName} → ${position.name}`)
        }
      }
      
      // Remaining attendants are already handled in the general pool above
      const remainingAttendants = generalPool
      console.log(`🔄 Remaining unassigned attendants: ${remainingAttendants.length}`)
      
      // PHASE 3: BALANCED SHIFT ASSIGNMENT
      console.log('📅 Phase 3: Ensuring balanced shift coverage...')
      
      let shiftAssignments = 0
      
      // Get all positions with shifts that need coverage
      const positionsWithShifts = positions.filter(pos => pos.shifts && pos.shifts.length > 0)
      
      for (const position of positionsWithShifts) {
        if (!position.shifts) continue
        
        for (const shift of position.shifts) {
          // Check current assignments for this shift
          const currentShiftAssignments = position.assignments?.filter(a => a.shift?.id === shift.id).length || 0
          
          if (currentShiftAssignments === 0 && availableAttendants.length > 0) {
            // This shift has no attendants - assign at least one
            const attendant = availableAttendants.shift()
            if (attendant) {
              const response = await fetch(`/api/events/${eventId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  positionId: position.id,
                  attendantId: attendant.id,
                  shiftId: shift.id,
                  role: 'ATTENDANT'
                })
              })
              
              if (response.ok) {
                shiftAssignments++
                console.log(`📅 Shift coverage: ${attendant.firstName} ${attendant.lastName} → ${position.name} (${shift.name})`)
              }
            }
          }
        }
      }

      // Enhanced success message with all statistics
      const hierarchySuccessRate = assignmentCount > 0 ? Math.round((hierarchyMatches / assignmentCount) * 100) : 0
      const totalFinalAssignments = assignmentCount + shiftAssignments
      
      alert(`🎯 Oversight-Aware Auto-Assign Complete!\n\n` +
            `✅ Total Assignments: ${assignmentCount}\n` +
            `👥 Positions with Oversight: ${positionsWithOversight.length} (prioritized)\n` +
            `📋 Positions without Oversight: ${positionsWithoutOversight.length}\n` +
            `📅 Shift Coverage: ${shiftAssignments}\n` +
            `🎉 Total Final Assignments: ${totalFinalAssignments}\n\n` +
            `System prioritizes positions with assigned overseers/keymen for better supervision.`)
      router.reload()
    } catch (error) {
      console.error('Auto-assign error:', error)
      alert('Failed to auto-assign attendants')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get unassigned attendants count (excluding leadership roles)
  const getUnassignedCount = () => {
    const assignedAttendantIds = new Set()
    const leadershipAttendantIds = new Set()
    
    positions.forEach(position => {
      position.assignments?.forEach(assignment => {
        if (assignment.attendant?.id) {
          assignedAttendantIds.add(assignment.attendant.id)
        }
        // Track overseers and keymen separately
        if (assignment.overseer?.id) {
          leadershipAttendantIds.add(assignment.overseer.id)
        }
        if (assignment.keyman?.id) {
          leadershipAttendantIds.add(assignment.keyman.id)
        }
      })
    })
    
    return attendants.filter(att => 
      att.isActive && 
      !assignedAttendantIds.has(att.id) && 
      !leadershipAttendantIds.has(att.id)
    ).length
  }

  // Get session data
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  // Helper function to reload page while preserving showInactive state
  const reloadWithState = () => {
    const url = new URL(window.location.href)
    if (showInactive) {
      url.searchParams.set('showInactive', 'true')
    } else {
      url.searchParams.delete('showInactive')
    }
    window.location.href = url.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading positions...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Head>
        <title>{event?.name ? `${event.name} - Positions` : 'Event Positions'} | JW Attendant Scheduler</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Link href="/events" className="hover:text-gray-700">Events</Link>
              <span>›</span>
              <Link href={`/events/${eventId}`} className="hover:text-gray-700">
                {event?.name || 'Event'}
              </Link>
              <span>›</span>
              <span className="text-gray-900">Positions</span>
            </nav>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Event Positions</h1>
                <p className="text-gray-600 mt-2">
                  Manage positions and roles for {event?.name}
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href={`/events/${eventId}`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  ← Back to Event
                </Link>
                
                {/* Bulk Operations */}
                {selectedPositions.size > 0 && (
                  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-blue-700 font-medium">
                      {selectedPositions.size} selected
                    </span>
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      disabled={selectedPositions.size === 0}
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                      title="Apply shift template to selected positions"
                    >
                      📅 Apply Template
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedPositions.size === 0}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setShowBulkEditModal(true)}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setSelectedPositions(new Set())}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleAutoAssign}
                  disabled={isSubmitting || getUnassignedCount() === 0}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  title={`Auto-assign ${getUnassignedCount()} available attendants`}
                >
                  🤖 Auto-Assign ({getUnassignedCount()})
                </button>
                
                <button
                  onClick={() => {
                    const newState = !showInactive
                    setShowInactive(newState)
                    
                    // Save to localStorage
                    localStorage.setItem(`showInactive-event-${eventId}`, newState.toString())
                    
                    // Update URL without page reload
                    const url = new URL(window.location.href)
                    if (newState) {
                      url.searchParams.set('showInactive', 'true')
                    } else {
                      url.searchParams.delete('showInactive')
                    }
                    window.history.replaceState({}, '', url.toString())
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    showInactive 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  title={showInactive ? 'Hide inactive positions' : 'Show inactive positions'}
                >
                  👁️ {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                </button>
                
                <button
                  onClick={() => setShowBulkCreator(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  🚀 Bulk Create
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  + Create Position
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">📋</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Positions</p>
                  <p className="text-2xl font-semibold text-gray-900">{positions.filter(p => p.isActive).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-semibold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Positions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {positions.filter(p => p.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">🏢</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Areas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {new Set(positions.filter(p => p.isActive).map(p => p.area).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Attendants</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {positions.filter(p => p.isActive).reduce((sum, p) => sum + (p.assignments?.filter(a => a.role === 'ATTENDANT').length || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Positions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.filter(p => p.isActive).length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions created</h3>
                <p className="text-gray-500 mb-4">Create your first position to get started</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowBulkCreator(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    🚀 Bulk Create
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create Position
                  </button>
                </div>
              </div>
            ) : (
              positions.filter(p => showInactive ? true : p.isActive).map((position) => (
                <div key={position.id} className={`rounded-lg shadow hover:shadow-md transition-shadow ${
                  position.isActive ? 'bg-white' : 'bg-gray-50 border-2 border-dashed border-gray-300'
                }`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedPositions.has(position.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedPositions)
                            if (e.target.checked) {
                              newSelected.add(position.id)
                            } else {
                              newSelected.delete(position.id)
                            }
                            setSelectedPositions(newSelected)
                          }}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`text-lg font-semibold mb-0 ${
                              position.isActive ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {position.name}
                            </h3>
                            {!position.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inactive
                              </span>
                            )}
                          </div>
                          {position.area && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {position.area}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        position.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {position.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {position.description && (
                      <p className="text-sm text-gray-600 mb-3">{position.description}</p>
                    )}


                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>Position #{position.positionNumber}</span>
                      <span>{position.shifts?.length || 0} shifts • {position.assignments?.filter(a => a.role === 'ATTENDANT').length || 0} attendants</span>
                    </div>


                    {/* SHIFT-SPECIFIC ASSIGNMENT DISPLAY */}
                    {position.shifts && position.shifts.length > 0 ? (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">🕐 Shift Assignments</p>
                        <div className="space-y-2">
                          {position.shifts.map(shift => {
                            // DEBUG: Log data for Station 2
                            if (position.name.includes('Station 2')) {
                              console.log('🔍 Station 2 Debug:', {
                                positionName: position.name,
                                shiftId: shift.id,
                                shiftName: shift.name,
                                totalAssignments: position.assignments?.length || 0,
                                assignments: position.assignments?.map(a => ({
                                  role: a.role,
                                  attendant: a.attendant ? `${a.attendant.firstName} ${a.attendant.lastName}` : 'null',
                                  shiftId: a.shift?.id || 'null',
                                  hasShift: !!a.shift
                                }))
                              });
                            }
                            
                            // Find assignments for this specific shift
                            const shiftSpecificAssignments = position.assignments?.filter(assignment => 
                              assignment.shift?.id === shift.id
                            ) || []
                            
                            // Get ALL leadership assignments (both position-level and shift-specific)
                            const allLeadershipAssignments = position.assignments?.filter(assignment => 
                              assignment.role === 'OVERSEER' || assignment.role === 'KEYMAN'
                            ) || []
                            
                            // Separate regular attendants from leadership for this shift
                            const attendantAssignments = shiftSpecificAssignments.filter(assignment => 
                              assignment.role === 'ATTENDANT'
                            )
                            const shiftLeadershipAssignments = shiftSpecificAssignments.filter(assignment => 
                              assignment.role === 'OVERSEER' || assignment.role === 'KEYMAN'
                            )
                            
                            return (
                              <div key={shift.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-gray-700">
                                      {shift.name}
                                    </span>
                                    {!shift.isAllDay && (
                                      <span className="text-xs text-gray-500">
                                        {shift.startTime} - {shift.endTime}
                                      </span>
                                    )}
                                    {shift.isAllDay && (
                                      <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded">
                                        All Day
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-400">
                                      {attendantAssignments.length} attendant{attendantAssignments.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteShift(position.id, shift.id, shift.name)}
                                      className="text-xs text-red-600 hover:text-red-800 hover:bg-red-100 rounded px-1 py-0.5 transition-colors"
                                      title={`Delete ${shift.name} shift`}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Shift Leadership Assignments */}
                                {shiftLeadershipAssignments.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs font-medium text-gray-600 mb-1">Oversight:</p>
                                    <div className="space-y-1">
                                      {shiftLeadershipAssignments.map(assignment => {
                                        const roleColor = assignment.role === 'OVERSEER' ? 'text-blue-700' : 'text-purple-700'
                                        const bgColor = assignment.role === 'OVERSEER' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'
                                        
                                        return (
                                          <div key={assignment.id} className={`flex items-center justify-between ${bgColor} border rounded px-2 py-1`}>
                                            <div className="flex items-center">
                                              <span className={`text-xs font-medium ${roleColor}`}>
                                                {assignment.attendant?.firstName} {assignment.attendant?.lastName}
                                              </span>
                                              <span className="ml-2 text-xs text-gray-500">
                                                ({assignment.role})
                                              </span>
                                            </div>
                                            <button
                                              onClick={() => handleRemoveAssignment(assignment.id)}
                                              className="text-xs text-red-600 hover:text-red-800 px-1"
                                              title="Remove assignment"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Attendant Assignments */}
                                {attendantAssignments.length > 0 ? (
                                  <div className="space-y-1">
                                    {attendantAssignments.map(assignment => {
                                      // Attendant assignments should be green
                                      const roleColor = 'text-green-700'
                                      const bgColor = 'bg-green-50 border-green-100'
                                      
                                      return (
                                        <div key={assignment.id} className={`flex items-center justify-between ${bgColor} border rounded px-2 py-1`}>
                                          <div className="flex items-center">
                                            <span className={`text-xs font-medium ${roleColor}`}>
                                              {assignment.attendant?.firstName} {assignment.attendant?.lastName}
                                            </span>
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({assignment.role || 'Attendant'})
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleRemoveAssignment(assignment.id)}
                                            className="text-xs text-red-600 hover:text-red-800 px-1"
                                            title="Remove assignment"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedPosition(position)
                                      setSelectedShift(shift)
                                      setShowAssignAttendantModal(true)
                                    }}
                                    className="w-full text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-1 transition-colors"
                                  >
                                    + Assign Attendant
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Add Shift Button - Only show if no All Day shift exists */}
                        {!position.shifts?.some(s => s.isAllDay) ? (
                          <button
                            onClick={() => {
                              setSelectedPosition(position)
                              setShowShiftModal(true)
                            }}
                            className="w-full mt-2 text-xs text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 rounded px-2 py-1 transition-colors"
                          >
                            + Add Shift
                          </button>
                        ) : (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                            ℹ️ Cannot add more shifts - this position has an All Day shift that covers the entire 24-hour period
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">🕐 No Shifts Created</p>
                        <button
                          onClick={() => {
                            setSelectedPosition(position)
                            setShowShiftModal(true)
                          }}
                          className="w-full text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-1 transition-colors"
                        >
                          + Create First Shift
                        </button>
                      </div>
                    )}

                    {/* Legacy Assignment Display (for positions without shifts) */}
                    {(!position.shifts || position.shifts.length === 0) && position.assignments && position.assignments.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">👤 Legacy Assignments</p>
                        <div className="space-y-1">
                          {position.assignments
                            .filter(assignment => !assignment.shift)
                            .map(assignment => (
                            <div key={assignment.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                              <div className="flex items-center">
                                <span className="text-xs font-medium text-yellow-700">
                                  {assignment.attendant?.firstName} {assignment.attendant?.lastName}
                                </span>
                                <span className="ml-2 text-xs text-yellow-600">
                                  (Needs Shift Assignment)
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveAssignment(assignment.id)}
                                className="text-xs text-red-600 hover:text-red-800 px-1"
                                title="Remove assignment"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setSelectedPosition(position)
                              setShowAssignAttendantModal(true)
                            }}
                            className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-1 transition-colors"
                          >
                            + Assign Attendant
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Position Management Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => {
                          setSelectedPosition(position)
                          setShowOverseerModal(true)
                        }}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded transition-colors"
                      >
                        👥 Assign Oversight
                      </button>
                      <button
                        onClick={() => handleEdit(position)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(position.id)}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>

                    {/* APEX GUARDIAN: Oversight Assignments Display */}
                    {(() => {
                      console.log(`🔍 Position ${position.positionNumber} oversight data:`, position.oversight)
                      console.log(`🔍 Position ${position.positionNumber} has oversight:`, position.oversight && position.oversight.length > 0)
                      return null
                    })()}
                    {position.oversight && position.oversight.length > 0 && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="text-sm font-medium text-green-800 mb-2">👥 Position Oversight</h4>
                        {position.oversight.map((oversight) => (
                          <div key={oversight.id} className="space-y-1">
                            {oversight.overseer && (
                              <div className="text-xs text-green-700">
                                <span className="font-medium">Overseer:</span> {oversight.overseer.firstName} {oversight.overseer.lastName}
                              </div>
                            )}
                            {oversight.keyman && (
                              <div className="text-xs text-green-700">
                                <span className="font-medium">Keyman:</span> {oversight.keyman.firstName} {oversight.keyman.lastName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Special handling for inactive positions */}
                    {!position.isActive && (
                      <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/events/${eventId}/positions/${position.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isActive: true }),
                              })
                              if (response.ok) {
                                reloadWithState()
                              } else {
                                alert('Failed to activate position')
                              }
                            } catch (error) {
                              alert('Failed to activate position')
                            }
                          }}
                          className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          ✅ Activate
                        </button>
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              const confirmed = confirm(
                                `⚠️ PERMANENT DELETION ⚠️\n\n` +
                                `This will permanently delete "${position.name}" from the database.\n` +
                                `This action CANNOT be undone.\n\n` +
                                `Are you absolutely sure?`
                              )
                              if (!confirmed) return

                              try {
                                const response = await fetch(`/api/events/${eventId}/positions/${position.id}?hardDelete=true`, {
                                  method: 'DELETE'
                                })
                                const result = await response.json()
                                
                                if (response.ok) {
                                  alert(`Position "${position.name}" permanently deleted.`)
                                  reloadWithState()
                                } else {
                                  if (result.dependencies) {
                                    alert(
                                      `Cannot delete - has dependencies:\n` +
                                      `• ${result.dependencies.assignments} assignments\n` +
                                      `• ${result.dependencies.shifts} shifts\n\n` +
                                      `Remove dependencies first.`
                                    )
                                  } else {
                                    alert(`Failed: ${result.error}`)
                                  }
                                }
                              } catch (error) {
                                alert('Failed to permanently delete position')
                              }
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                            title="Permanently delete position (Admin only)"
                          >
                            🗑️ Delete Forever
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bulk Position Creator Modal */}
        {showBulkCreator && (
          <BulkPositionCreator
            eventId={eventId}
            onClose={() => setShowBulkCreator(false)}
            onSuccess={handleBulkCreateSuccess}
          />
        )}

        {/* Create/Edit Position Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingPosition ? 'Edit Position' : 'Create New Position'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="positionNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Position Number *
                    </label>
                    <input
                      type="number"
                      id="positionNumber"
                      value={formData.positionNumber}
                      onChange={(e) => setFormData({ ...formData, positionNumber: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="1000"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Position Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Sound Operator, Parking Attendant"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                      Area
                    </label>
                    <input
                      type="text"
                      id="area"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Main Hall, Parking Lot A"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of the position..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {editingPosition ? 'Update Position' : 'Create Position'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Shift Creation Modal */}
        {showShiftModal && selectedPosition && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add Shift to {selectedPosition.name}
                </h3>
                
                <form onSubmit={handleShiftSubmit}>
                  <div className="space-y-4">
                    
                    {/* Template Option */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Templates
                      </label>
                      <select 
                        onChange={(e) => {
                          const template = e.target.value
                          if (template === 'morning') {
                            setShiftFormData({ ...shiftFormData, startTime: '07:50', endTime: '10:00', isAllDay: false })
                          } else if (template === 'midday') {
                            setShiftFormData({ ...shiftFormData, startTime: '10:00', endTime: '12:00', isAllDay: false })
                          } else if (template === 'afternoon') {
                            setShiftFormData({ ...shiftFormData, startTime: '12:00', endTime: '14:00', isAllDay: false })
                          } else if (template === 'evening') {
                            setShiftFormData({ ...shiftFormData, startTime: '14:00', endTime: '17:00', isAllDay: false })
                          } else if (template === 'allday') {
                            setShiftFormData({ ...shiftFormData, startTime: '', endTime: '', isAllDay: true })
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a template or create custom...</option>
                        <option value="morning">Morning (7:50 - 10:00)</option>
                        <option value="midday">Midday (10:00 - 12:00)</option>
                        <option value="afternoon">Afternoon (12:00 - 14:00)</option>
                        <option value="evening">Evening (14:00 - 17:00)</option>
                        <option value="allday">All Day</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={shiftFormData.startTime}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={shiftFormData.isAllDay}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={shiftFormData.endTime}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={shiftFormData.isAllDay}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={shiftFormData.isAllDay}
                          onChange={(e) => setShiftFormData({ ...shiftFormData, isAllDay: e.target.checked })}
                          className="mr-2" 
                        />
                        <span className="text-sm text-gray-700">All Day Shift</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowShiftModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                      Add Shift
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Overseer Assignment Modal */}
        {showOverseerModal && selectedPosition && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Assign Overseer to {selectedPosition.name}
                </h3>
                
                <form onSubmit={handleOverseerSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Overseer
                      </label>
                      <select 
                        value={overseerFormData.overseerId}
                        onChange={(e) => setOverseerFormData({ ...overseerFormData, overseerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select an overseer...</option>
                        {attendants?.filter(att => {
                          const formsOfService = Array.isArray(att.formsOfService) ? att.formsOfService : 
                            (typeof att.formsOfService === 'string' ? att.formsOfService.split(',').map(s => s.trim()) : [])
                          return formsOfService.some(form => 
                            form.toLowerCase() === 'overseer'
                          )
                        }).map(attendant => (
                          <option key={attendant.id} value={attendant.id}>
                            {attendant.firstName} {attendant.lastName} (Elder)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Keyman (Optional)
                      </label>
                      <select 
                        value={overseerFormData.keymanId}
                        onChange={(e) => setOverseerFormData({ ...overseerFormData, keymanId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a keyman...</option>
                        {attendants?.filter(att => {
                          const formsOfService = Array.isArray(att.formsOfService) ? att.formsOfService : 
                            (typeof att.formsOfService === 'string' ? att.formsOfService.split(',').map(s => s.trim()) : [])
                          return formsOfService.some(form => 
                            form.toLowerCase() === 'keyman'
                          )
                        }).map(attendant => (
                          <option key={attendant.id} value={attendant.id}>
                            {attendant.firstName} {attendant.lastName} (MS)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Responsibilities
                      </label>
                      <textarea
                        rows={3}
                        value={overseerFormData.responsibilities}
                        onChange={(e) => setOverseerFormData({ ...overseerFormData, responsibilities: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Special instructions or responsibilities..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowOverseerModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                    >
                      Assign Overseer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Assign Attendant Modal */}
        {showAssignAttendantModal && selectedPosition && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Assign Attendant to {selectedPosition.name}
                  {selectedShift && (
                    <div className="text-sm text-gray-600 mt-1">
                      Shift: {selectedShift.name} {!selectedShift.isAllDay && `(${selectedShift.startTime} - ${selectedShift.endTime})`}
                    </div>
                  )}
                </h3>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const attendantId = formData.get('attendantId') as string
                  const shiftId = formData.get('shiftId') as string
                  
                  if (!attendantId) {
                    alert('Please select an attendant')
                    return
                  }
                  
                  if (!shiftId) {
                    alert('Please select a shift')
                    return
                  }

                  try {
                    const response = await fetch(`/api/events/${eventId}/assignments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        positionId: selectedPosition.id,
                        attendantId: attendantId,
                        shiftId: shiftId,
                        role: 'ATTENDANT'
                      })
                    })

                    if (response.ok) {
                      alert('Attendant assigned successfully')
                      setShowAssignAttendantModal(false)
                      setSelectedShift(null)
                      router.reload()
                    } else {
                      const errorData = await response.json()
                      
                      // Handle specific conflict types
                      if (response.status === 409) {
                        if (errorData.conflictType === 'DUPLICATE_SHIFT_ASSIGNMENT') {
                          alert('⚠️ Conflict: This attendant is already assigned to this shift.')
                        } else if (errorData.conflictType === 'TIME_OVERLAP') {
                          alert(`⚠️ Time Conflict: This attendant has conflicting assignments:\n\n${errorData.conflicts?.map(c => `• ${c.positionName} - ${c.shiftName}`).join('\n')}\n\nPlease choose a different attendant or shift.`)
                        } else if (errorData.conflictType === 'SHIFT_FULL') {
                          alert('⚠️ Shift Full: This shift already has the maximum number of attendants assigned (1).')
                        } else if (errorData.conflictType === 'ROLE_OCCUPIED') {
                          alert(`⚠️ Role Occupied: ${errorData.message}`)
                        } else {
                          alert(`⚠️ Assignment Conflict: ${errorData.message || 'Unable to assign attendant to this shift.'}`)
                        }
                      } else {
                        alert(`Failed to assign attendant: ${errorData.error || 'Unknown error'}`)
                      }
                    }
                  } catch (error) {
                    console.error('Error assigning attendant:', error)
                    alert('Failed to assign attendant')
                  }
                }}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Attendant
                      {(() => {
                        const positionOverseer = selectedPosition.assignments?.find(a => a.role === 'OVERSEER')?.attendant
                        const positionKeyman = selectedPosition.assignments?.find(a => a.role === 'KEYMAN')?.attendant
                        
                        if (positionOverseer || positionKeyman) {
                          return (
                            <span className="text-xs text-orange-600 font-normal block mt-1">
                              Showing all attendants (hierarchy filtering temporarily disabled)
                            </span>
                          )
                        }
                        return null
                      })()}
                    </label>
                    <select 
                      name="attendantId"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select an attendant...</option>
                      {(() => {
                        // Get the overseer and keyman for this position
                        const positionOverseer = selectedPosition.assignments?.find(a => a.role === 'OVERSEER')?.attendant
                        const positionKeyman = selectedPosition.assignments?.find(a => a.role === 'KEYMAN')?.attendant
                        
                        // For now, show all active attendants since the overseer/keyman relationships 
                        // are not properly set up in the database yet
                        let filteredAttendants = attendants?.filter(att => att.isActive) || []
                        
                        // TODO: Implement proper filtering once overseer/keyman relationships are established
                        // if (positionOverseer || positionKeyman) {
                        //   filteredAttendants = filteredAttendants.filter(attendant => {
                        //     return (positionOverseer && attendant.overseerId === positionOverseer.id) ||
                        //            (positionKeyman && attendant.keymanId === positionKeyman.id)
                        //   })
                        // }
                        
                        return filteredAttendants.map(attendant => (
                          <option key={attendant.id} value={attendant.id}>
                            {attendant.firstName} {attendant.lastName}
                            {attendant.congregation && ` (${attendant.congregation})`}
                          </option>
                        ))
                      })()}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Shift
                    </label>
                    <select 
                      name="shiftId"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      defaultValue={selectedShift?.id || ''}
                    >
                      <option value="">Select a shift...</option>
                      {selectedPosition.shifts?.map(shift => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} {!shift.isAllDay && `(${shift.startTime} - ${shift.endTime})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignAttendantModal(false)
                        setSelectedShift(null)
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                      Assign Attendant
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Redesigned Bulk Operations Modal */}
        {showBulkEditModal && selectedPositions.size > 0 && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Bulk Operations - {selectedPositions.size} Positions Selected
                </h3>
                
                {/* Three Separated Operation Sections */}
                <div className="space-y-8">
                  
                  {/* 1. BULK POSITION UPDATES */}
                  <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                    <h4 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">1</span>
                      Bulk Position Updates
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Update Area
                        </label>
                        <input
                          id="bulk-area"
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Leave blank to keep current"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Update Status
                        </label>
                        <select 
                          id="bulk-status"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Keep current status</option>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleBulkPositionUpdate}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium"
                      >
                        {isSubmitting ? 'Updating...' : `Update ${selectedPositions.size} Positions`}
                      </button>
                    </div>
                  </div>

                  {/* 2. BULK SHIFT OPERATIONS */}
                  <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                    <h4 className="text-lg font-medium text-orange-900 mb-4 flex items-center">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">2</span>
                      Bulk Shift Operations
                    </h4>
                    
                    {/* Apply Template Option */}
                    <div className="mb-6 p-4 border border-orange-300 rounded-md bg-white">
                      <h5 className="font-medium text-gray-900 mb-3">Apply Shift Template</h5>
                      <div className="flex items-center space-x-4">
                        <select 
                          id="bulk-template"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Choose a template...</option>
                          <option value="standard">Standard Day (7:50-10, 10-12, 12-2, 2-5)</option>
                          <option value="extended">Extended Day (6:30-8:30, 8:30-10:30, 10:30-12:45, 12:45-3, 3-Close)</option>
                          <option value="allday">All Day Shift</option>
                        </select>
                        <button
                          onClick={handleBulkTemplateApplication}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md font-medium"
                        >
                          Apply Template
                        </button>
                      </div>
                    </div>
                    
                    {/* Create Custom Shift Option */}
                    <div className="p-4 border border-orange-300 rounded-md bg-white">
                      <h5 className="font-medium text-gray-900 mb-3">Create Custom Shift</h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shift Name
                          </label>
                          <input
                            id="bulk-shift-name"
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g., Morning"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <input
                            id="bulk-shift-start"
                            type="time"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <input
                            id="bulk-shift-end"
                            type="time"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <div className="flex items-center h-10">
                            <input
                              id="bulk-shift-allday"
                              type="checkbox"
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <label htmlFor="bulk-shift-allday" className="ml-2 text-sm text-gray-900">
                              All Day
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleBulkCustomShiftCreation}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md font-medium"
                        >
                          {isSubmitting ? 'Creating...' : `Create Shift for ${selectedPositions.size} Positions`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. BULK OVERSIGHT ASSIGNMENT */}
                  <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                    <h4 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">3</span>
                      Bulk Oversight Assignment
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign Overseer
                        </label>
                        <select 
                          id="bulk-overseer"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">No change</option>
                          {attendants?.filter(att => att.isActive && Array.isArray(att.formsOfService) && att.formsOfService.some(form => form.toLowerCase() === 'overseer')).map(attendant => (
                            <option key={attendant.id} value={attendant.id}>
                              {attendant.firstName} {attendant.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assign Keyman
                        </label>
                        <select 
                          id="bulk-keyman"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">No change</option>
                          {attendants?.filter(att => att.isActive && Array.isArray(att.formsOfService) && att.formsOfService.some(form => form.toLowerCase() === 'keyman')).map(attendant => (
                            <option key={attendant.id} value={attendant.id}>
                              {attendant.firstName} {attendant.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-md">
                      <p className="text-sm text-green-800">
                        ✅ <strong>No shift dependency required</strong> - Oversight can be assigned independently of shifts
                      </p>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleBulkOversightAssignment}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium"
                      >
                        {isSubmitting ? 'Assigning...' : `Assign Oversight to ${selectedPositions.size} Positions`}
                      </button>
                    </div>
                  </div>
                  
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shift Template Application Modal */}
        {showTemplateModal && selectedPositions.size > 0 && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Apply Shift Template to {selectedPositions.size} Position(s)
                </h3>
                
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const templateType = formData.get('templateType') as string
                  
                  if (!templateType) {
                    alert('Please select a template')
                    return
                  }

                  try {
                    setIsSubmitting(true)
                    
                    const response = await fetch(`/api/events/${eventId}/positions/apply-shift-template`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        positionIds: Array.from(selectedPositions),
                        templateType: templateType
                      })
                    })

                    if (response.ok) {
                      const result = await response.json()
                      alert(`✅ Template Applied Successfully!\n\n` +
                            `• Positions: ${result.data.positionsProcessed}\n` +
                            `• Shifts Created: ${result.data.totalShiftsCreated}\n` +
                            `• Template: ${result.data.templateType}`)
                      setShowTemplateModal(false)
                      setSelectedPositions(new Set())
                      router.reload()
                    } else {
                      const error = await response.json()
                      alert(`Failed to apply template: ${error.error || 'Unknown error'}`)
                    }
                  } catch (error) {
                    console.error('Error applying template:', error)
                    alert('Failed to apply template')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Shift Template
                    </label>
                    <select 
                      name="templateType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Choose a template...</option>
                      <option value="standard">
                        Standard Day (7:50-10, 10-12, 12-2, 2-5)
                      </option>
                      <option value="extended">
                        Extended Day (6:30-8:30, 8:30-10:30, 10:30-12:45, 12:45-3, 3-Close)
                      </option>
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> This will create shifts for all selected positions. 
                      Existing shifts will not be affected.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTemplateModal(false)
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md"
                    >
                      {isSubmitting ? 'Applying...' : 'Apply Template'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  console.log('🔍 APEX GUARDIAN: getServerSideProps called at', new Date().toISOString())
  try {
    console.log('🔍 Step 1: Getting session...')
    const session = await getServerSession(context.req, context.res, authOptions)
  
    if (!session) {
      return {
        redirect: {
          destination: '/auth/signin',
        },
      }
    }

    // APEX GUARDIAN: Full SSR data fetching for positions tab
    console.log('🔍 Step 2: Getting event ID from params...')
    const { id } = context.params!
    console.log('🔍 Step 3: Event ID:', id)
    
    console.log('🔍 Step 4: Importing Prisma...')
    const { prisma } = await import('../../../src/lib/prisma')
    console.log('🔍 Step 5: Prisma imported successfully')
    
    // Fetch event with positions data
    console.log('🔍 Step 6: Fetching event data...')
    const eventData = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        positions: {
          include: {
            assignments: {
              include: {
                attendant: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                overseer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                keyman: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                shift: {
                  select: {
                    id: true,
                    name: true,
                    startTime: true,
                    endTime: true,
                    isAllDay: true
                  }
                }
              }
            },
            shifts: true
          },
          orderBy: [
            { positionNumber: 'asc' }
          ]
        }
      }
    })
    console.log('🔍 Step 7: Event data fetched successfully, positions count:', eventData?.positions?.length || 0)

    // Fetch attendants for overseer assignment from attendants table
    // APEX GUARDIAN: Manually fetch oversight data since relation has TypeScript issues
    console.log('🔍 Step 8: Fetching oversight data separately...')
    const oversightData = await (prisma as any).position_oversight_assignments.findMany({
      where: { eventId: id as string },
      include: {
        overseer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        keyman: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
    console.log('🔍 Step 9: Oversight data fetched, count:', oversightData.length)

    // Attach oversight data to positions
    const positionsWithOversight = eventData!.positions.map((position: any) => {
      const positionOversight = oversightData.filter((oversight: any) => oversight.positionId === position.id)
      return {
        ...position,
        oversight: positionOversight
      }
    })
    console.log('🔍 Step 10: Positions with oversight attached')

    console.log('🔍 Step 11: Fetching attendants data...')
    const attendantsData = await prisma.attendants.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        formsOfService: true,
        congregation: true,
        isActive: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })
    
    if (!eventData) {
      return { notFound: true }
    }

    // Transform event data
    const event = {
      id: eventData.id,
      name: eventData.name,
      eventType: eventData.eventType,
      startDate: eventData.startDate?.toISOString() || null,
      endDate: eventData.endDate?.toISOString() || null,
      status: eventData.status
    }

    // Transform positions data
    const positions = eventData.positions.map(position => ({
      id: position.id,
      positionNumber: position.positionNumber,
      name: position.name,
      description: position.description,
      area: position.area || null,
      sequence: position.sequence || position.positionNumber,
      isActive: position.isActive,
      assignments: position.assignments.map(assignment => ({
        id: assignment.id,
        role: assignment.role || 'ATTENDANT',
        attendant: assignment.attendant ? {
          id: assignment.attendant.id,
          firstName: assignment.attendant.firstName,
          lastName: assignment.attendant.lastName
        } : null,
        overseer: assignment.overseer ? {
          id: assignment.overseer.id,
          firstName: assignment.overseer.firstName,
          lastName: assignment.overseer.lastName
        } : null,
        keyman: assignment.keyman ? {
          id: assignment.keyman.id,
          firstName: assignment.keyman.firstName,
          lastName: assignment.keyman.lastName
        } : null,
        shift: assignment.shift ? {
          id: assignment.shift.id,
          name: assignment.shift.name,
          startTime: assignment.shift.startTime,
          endTime: assignment.shift.endTime,
          isAllDay: assignment.shift.isAllDay
        } : null
      })).filter(assignment => assignment.attendant !== null)
    }))

    // APEX GUARDIAN: Debug positions data loading
    console.log('🔍 Step 12: Final positions with oversight count:', positionsWithOversight.length)
    const positionsWithOversightData = positionsWithOversight.filter((p: any) => p.oversight && p.oversight.length > 0)
    console.log('🔍 Step 13: Positions that have oversight data:', positionsWithOversightData.length)
    positionsWithOversightData.forEach((p: any) => {
      console.log(`🔍 Position ${p.positionNumber} oversight:`, p.oversight)
    })

    return {
      props: {
        eventId: id as string,
        event,
        positions: positionsWithOversight,
        attendants: attendantsData,
        stats: {
          total: positionsWithOversight.length,
          active: positionsWithOversight.filter(p => p.isActive).length,
          assigned: positionsWithOversight.filter(p => p.assignments.length > 0).length
        }
      }
    }

  } catch (error) {
    console.error('Error fetching event data:', error)
    return {
      notFound: true
    }
  }
}
