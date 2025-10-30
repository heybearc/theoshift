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
  email?: string
  phone?: string
  emergencyContact?: string
  medicalInfo?: string
  formsOfService: string[] | string
  congregation?: string
  isActive: boolean
  overseerId?: string | null
  keymanId?: string | null
  overseer?: {
    id: string
    firstName: string
    lastName: string
  } | null
  keyman?: {
    id: string
    firstName: string
    lastName: string
  } | null
  users?: {
    role: string
  } | null
}

interface EventPositionsProps {
  eventId: string
  event: Event
  positions: Position[]
  attendants: Attendant[]
  stats: Stats
  canManageContent: boolean
}

export default function EventPositionsPage({ eventId, event, positions, attendants, stats, canManageContent }: EventPositionsProps) {
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
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [assignmentProgress, setAssignmentProgress] = useState({
    phase: '',
    current: 0,
    total: 0,
    message: '',
    assignments: [] as Array<{attendant: string, position: string, shift: string}>
  })
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedShift, setSelectedShift] = useState<any | null>(null)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [bulkCreateResults, setBulkCreateResults] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set())
  const [showInactive, setShowInactive] = useState(false)
  const [showAvailableAttendants, setShowAvailableAttendants] = useState(false)

  // Utility function to format 24-hour time to 12-hour format
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

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
    
    // Restore scroll position if it was saved recently (within 5 seconds)
    const savedScrollY = sessionStorage.getItem('positions_scroll_y')
    const savedScrollX = sessionStorage.getItem('positions_scroll_x')
    const savedTimestamp = sessionStorage.getItem('positions_scroll_timestamp')
    
    if (savedScrollY && savedScrollX && savedTimestamp) {
      const timeSinceSave = Date.now() - parseInt(savedTimestamp)
      // Only restore if saved within last 5 seconds (prevents stale scroll positions)
      if (timeSinceSave < 5000) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          window.scrollTo(parseInt(savedScrollX), parseInt(savedScrollY))
          // Don't clear immediately - allow multiple refreshes to use same position
        }, 100)
      } else {
        // Clear stale scroll position
        sessionStorage.removeItem('positions_scroll_y')
        sessionStorage.removeItem('positions_scroll_x')
        sessionStorage.removeItem('positions_scroll_timestamp')
      }
    }
  }, [eventId])
  const [shiftFormData, setShiftFormData] = useState({
    name: '',
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
        router.reload() // Refresh data without page reload
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
        router.reload()
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
          name: shiftFormData.name || null,
          startTime: shiftFormData.startTime,
          endTime: shiftFormData.endTime,
          isAllDay: shiftFormData.isAllDay,
          positionId: selectedPosition.id
        }),
      })

      if (response.ok) {
        alert('✅ Shift added successfully')
        setShowShiftModal(false)
        setShiftFormData({ name: '', startTime: '', endTime: '', isAllDay: false })
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
      const response = await fetch(`/api/events/${eventId}/positions/${selectedPosition.id}/position-oversight`, {
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

  const handleBulkCreateSuccess = async (result: any) => {
    alert(`Successfully created ${result.created} positions`)
    setShowBulkCreator(false)
    router.reload() // Refresh page to show updated data
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
      router.reload()
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
        router.reload()
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
      router.reload()
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
        router.reload()
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
        // Don't show alert - just reload to preserve scroll position
        router.reload()
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
        router.reload()
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
        // Refetch data without page reload - scroll position preserved automatically!
        router.reload()
      } else {
        alert('Failed to remove assignment')
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
      alert('Failed to remove assignment')
    }
  }

  // Auto-assign algorithm - APEX GUARDIAN OVERSIGHT-AWARE VERSION v3.0 - NUCLEAR CACHE BUST
  const handleAutoAssignOversightAware = async () => {
    // Clear previous logs
    localStorage.setItem('autoAssignLogs', JSON.stringify([]))
    const log = (msg: string) => {
      console.log(msg)
      const logs = JSON.parse(localStorage.getItem('autoAssignLogs') || '[]')
      logs.push(msg)
      localStorage.setItem('autoAssignLogs', JSON.stringify(logs))
    }
    
    log('🚨🚨🚨 OVERSIGHT-AWARE v5.0 - TIMESTAMP: ' + Date.now() + ' 🚨🚨🚨')
    log('🎯 OVERSIGHT-AWARE AUTO-ASSIGN v5.0 RUNNING!')
    log(`📊 Total Positions: ${positions.length}`)
    log(`📊 Total Attendants: ${attendants.length}`)
    
    if (!confirm('Auto-assign available attendants to unfilled positions?')) return
    
    try {
      setIsSubmitting(true)
      setShowProgressModal(true)
      
      // Calculate total shifts to assign for progress tracking
      const totalShifts = positions.filter(p => p.isActive).reduce((sum, pos) => sum + (pos.shifts?.length || 0), 0)
      
      setAssignmentProgress({
        phase: 'Initializing Smart Auto-Assignment...',
        current: 0,
        total: totalShifts,
        message: `Analyzing ${totalShifts} shifts across ${positions.filter(p => p.isActive).length} positions...`,
        assignments: []
      })
      
      // HIERARCHY-BASED AUTO-ASSIGN ALGORITHM
      console.log('🎯 Starting Hierarchy-Based Auto-Assign - OVERSIGHT-AWARE VERSION!')
      
      // APEX GUARDIAN: Debug the attendants array being used
      console.log('🔍 CRITICAL DEBUG: Attendants array in auto-assign:')
      console.log(`   📊 Total attendants: ${attendants?.length || 0}`)
      console.log(`   📊 Attendants array:`, attendants)
      
      // CRITICAL FIX: Use the same attendants data that manual assignment uses
      console.log('🔧 CRITICAL FIX: Ensuring auto-assign uses same data as manual assignment')
      
      // FILTER: Only use attendants who are assigned to this event (have oversight data)
      const eventSpecificAttendants = attendants.filter(att => att.overseerId || att.keymanId)
      console.log(`   📊 Total attendants: ${attendants?.length || 0}`)
      console.log(`   📊 Event-specific attendants (with oversight): ${eventSpecificAttendants?.length || 0}`)
      
      // Check if attendants have oversight data
      if (attendants && attendants.length > 0) {
        console.log('🔍 First 3 attendants oversight check:')
        attendants.slice(0, 3).forEach((att, index) => {
          console.log(`   ${index + 1}. ${att.firstName} ${att.lastName}:`)
          console.log(`      - overseerId: ${att.overseerId}`)
          console.log(`      - keymanId: ${att.keymanId}`)
          console.log(`      - overseer: ${att.overseer ? `${att.overseer.firstName} ${att.overseer.lastName}` : 'null'}`)
          console.log(`      - keyman: ${att.keyman ? `${att.keyman.firstName} ${att.keyman.lastName}` : 'null'}`)
        })
        
        // Count attendants with oversight
        const attendantsWithOversight = attendants.filter(att => att.overseerId)
        console.log(`❌ CRITICAL ISSUE: Only ${attendantsWithOversight.length} out of ${attendants.length} attendants have overseerId!`)
        
        if (attendantsWithOversight.length === 0) {
          console.log('🚨 PROBLEM IDENTIFIED: Attendants array does not have event-specific oversight data!')
          console.log('💡 SOLUTION: Auto-assign needs to use event-specific attendant data with oversight assignments')
        }
      } else {
        console.log('❌ CRITICAL ERROR: No attendants array available!')
      }
      
      // Get leadership IDs to avoid assigning them as regular attendants
      const leadershipAttendantIds = new Set()
      
      positions.forEach(position => {
        position.assignments?.forEach(assignment => {
          // Track overseers and keymen separately - they should not be assigned as attendants
          if (assignment.overseer?.id) {
            leadershipAttendantIds.add(assignment.overseer.id)
          }
          if (assignment.keyman?.id) {
            leadershipAttendantIds.add(assignment.keyman.id)
          }
        })
      })
      
      // Find available attendants (not in leadership roles)
      // REMOVED: assignedAttendantIds check - attendants CAN be assigned to multiple shifts
      // The API will handle time conflict checking per shift
      const availableAttendants = eventSpecificAttendants.filter(att => 
        att.isActive && 
        !leadershipAttendantIds.has(att.id)
      )
      
      // APEX GUARDIAN: Debug attendant oversight data in auto-assign
      console.log(`🔍 AUTO-ASSIGN DEBUG: Checking attendant oversight data...`)
      console.log(`👥 Available attendants: ${availableAttendants.length}`)
      
      // Check first few attendants to see their oversight data
      availableAttendants.slice(0, 5).forEach(attendant => {
        console.log(`   👤 ${attendant.firstName} ${attendant.lastName}:`)
        console.log(`      - overseerId: ${attendant.overseerId}`)
        console.log(`      - keymanId: ${attendant.keymanId}`)
        console.log(`      - overseer: ${attendant.overseer ? `${attendant.overseer.firstName} ${attendant.overseer.lastName}` : 'null'}`)
        console.log(`      - keyman: ${attendant.keyman ? `${attendant.keyman.firstName} ${attendant.keyman.lastName}` : 'null'}`)
      })
      
      // Group attendants by their assigned leadership (overseer/keyman)
      const attendantsByLeadership = new Map()
      
      availableAttendants.forEach(attendant => {
        // CRITICAL: Exclude overseers and keymen from being assigned as attendants
        const isOverseer = positions.some(pos => 
          pos.oversight?.some(o => o.overseer?.id === attendant.id)
        )
        const isKeyman = positions.some(pos => 
          pos.oversight?.some(o => o.keyman?.id === attendant.id)
        )
        
        if (isOverseer || isKeyman) {
          console.log(`🚫 EXCLUDING ${attendant.firstName} ${attendant.lastName} - is ${isOverseer ? 'Overseer' : 'Keyman'}`)
          return // Skip this attendant
        }
        
        // Create leadership key based on attendant's assigned overseer/keyman
        const overseerId = attendant.overseerId || 'none'
        const keymanId = attendant.keymanId || 'none'
        const leadershipKey = `${overseerId}-${keymanId}`
        
        if (!attendantsByLeadership.has(leadershipKey)) {
          attendantsByLeadership.set(leadershipKey, [])
        }
        attendantsByLeadership.get(leadershipKey).push(attendant)
        
        const overseerName = attendant.overseer ? `${attendant.overseer.firstName} ${attendant.overseer.lastName}` : 'None'
        const keymanName = attendant.keyman ? `${attendant.keyman.firstName} ${attendant.keyman.lastName}` : 'None'
        console.log(`👤 ${attendant.firstName} ${attendant.lastName} → Leadership: ${leadershipKey} (Overseer: ${overseerName}, Keyman: ${keymanName})`)
      })
      
      console.log(`👥 Available attendants for assignment: ${availableAttendants.length}`)
      console.log(`📊 Attendant leadership groups: ${attendantsByLeadership.size}`)
      
      // Debug the leadership groups
      for (const [leadershipKey, attendantsInGroup] of attendantsByLeadership) {
        console.log(`📊 Leadership group "${leadershipKey}": ${attendantsInGroup.length} attendants`)
        if (leadershipKey === 'none-none') {
          console.log(`   ⚠️  WARNING: ${attendantsInGroup.length} attendants have no oversight assigned!`)
        }
      }
      
      // Group positions by their leadership (overseer/keyman) 
      const positionsByLeadership = new Map()
      const positionsNeedingAttendants = positions.filter(pos => 
        pos.isActive
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
      let progressCount = 0
      
      console.log(`📊 Leadership Groups: ${attendantsByLeadership.size} attendant groups, ${positionsByLeadership.size} position groups`)
      
      // SKIP Phase 1: Let the two-pass logic handle everything with proper distribution limits
      console.log('⏭️  Skipping Phase 1 - using two-pass smart assignment instead')
      
      // Phase 1: Hierarchy-based assignments (perfect matches) - DISABLED
      if (false) {
      for (const [leadershipKey, positionsInGroup] of positionsByLeadership) {
        const attendantsInGroup = attendantsByLeadership.get(leadershipKey) || []
        
        if (attendantsInGroup.length > 0) {
          console.log(`🎯 Matching leadership group: ${leadershipKey} (${attendantsInGroup.length} attendants → ${positionsInGroup.length} positions)`)
          
          for (const position of positionsInGroup) {
            if (attendantsInGroup.length === 0) break
            
            // CRITICAL FIX: Include All Day shifts for positions with oversight
            const positionOversight = position.oversight?.[0]
            const hasOversight = positionOversight?.overseer || positionOversight?.keyman

            // Include All Day shifts ONLY if position has oversight
            const availableShifts = hasOversight
              ? position.shifts  // Include All Day if has oversight
              : position.shifts?.filter(shift => !shift.isAllDay) || []

            if (!availableShifts || availableShifts.length === 0) {
              console.log(`⚠️ Skipping ${position.name} - no shifts available`)
              continue
            }
            
            // CORRECT LOGIC: Build list of all shifts that need assignments (1 per shift)
            const shiftsNeedingAssignment: Array<{position: Position, shift: any}> = []
            
            for (const shift of availableShifts) {
              // Check if this shift already has an attendant assigned
              const currentAssignments = position.assignments?.filter(a => a.shift?.id === shift.id).length || 0
              if (currentAssignments === 0) {
                shiftsNeedingAssignment.push({position, shift})
              }
            }
            
            console.log(`🔍 POSITION DEBUG: ${position.name} has ${shiftsNeedingAssignment.length} shifts needing assignment`)
            
            // Assign attendants to shifts in this position using round-robin from the oversight group
            let attendantIndex = 0
            for (const {position: pos, shift} of shiftsNeedingAssignment) {
              if (attendantsInGroup.length === 0) {
                console.log(`⚠️ No more attendants in ${leadershipKey} group for ${pos.name} - ${shift.name}`)
                break
              }
              
              // Get next attendant (round-robin within the group) - use modulo to cycle through
              const attendant = attendantsInGroup[attendantIndex % attendantsInGroup.length]
              attendantIndex++
              if (!attendant) continue
              
              console.log(`🔍 OVERSIGHT DEBUG for ${pos.name} - ${shift.name}:`)
              const positionOversight = pos.oversight?.[0]
              console.log(`   📍 Position Overseer: ${positionOversight?.overseer?.firstName} ${positionOversight?.overseer?.lastName}`)
              console.log(`   📍 Position Keyman: ${positionOversight?.keyman?.firstName} ${positionOversight?.keyman?.lastName}`)
              console.log(`   👤 Attendant Overseer: ${attendant.overseer?.firstName} ${attendant.overseer?.lastName}`)
              console.log(`   👤 Attendant Keyman: ${attendant.keyman?.firstName} ${attendant.keyman?.lastName}`)
              console.log(`   🔑 Leadership Key: ${leadershipKey}`)
              console.log(`   🎯 Using shift: ${shift.name} (${shift.startTime} - ${shift.endTime})`)
              
              const response = await fetch(`/api/events/${eventId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  positionId: pos.id,
                  attendantId: attendant.id,
                  shiftId: shift.id,
                  role: 'ATTENDANT'
                })
              })
              
              if (response.ok) {
                assignmentCount++
                hierarchyMatches++
                progressCount++
                
                // Update progress
                setAssignmentProgress(prev => ({
                  ...prev,
                  phase: 'Phase 1: Perfect Oversight Matches',
                  current: progressCount,
                  message: `Assigning attendants to positions with matching oversight...`,
                  assignments: [...prev.assignments, `${attendant.firstName} ${attendant.lastName} → ${pos.name} - ${shift.name}`]
                }))
                
                const oversight = pos.oversight?.[0]
                const positionOverseerName = oversight?.overseer ? `${oversight.overseer.firstName} ${oversight.overseer.lastName}` : 'None'
                const positionKeymanName = oversight?.keyman ? `${oversight.keyman.firstName} ${oversight.keyman.lastName}` : 'None'
                const attendantOverseerName = attendant.overseer ? `${attendant.overseer.firstName} ${attendant.overseer.lastName}` : 'None'
                const attendantKeymanName = attendant.keyman ? `${attendant.keyman.firstName} ${attendant.keyman.lastName}` : 'None'
                console.log(`✅ Perfect match: ${attendant.firstName} ${attendant.lastName} → ${pos.name} - ${shift.name}`)
                console.log(`   👤 Attendant under: Overseer: ${attendantOverseerName}, Keyman: ${attendantKeymanName}`)
                console.log(`   📍 Position under: Overseer: ${positionOverseerName}, Keyman: ${positionKeymanName}`)
              } else {
                const errorData = await response.json()
                console.log(`❌ Assignment failed: ${attendant.firstName} ${attendant.lastName} → ${pos.name} - ${shift.name}`)
                console.log(`   Error: ${errorData.error || response.statusText}`)
              }
            }
          }
          
          // Remove assigned attendants from the main pool
          attendantsByLeadership.set(leadershipKey, attendantsInGroup)
        }
      }
      } // End of disabled Phase 1
      
      // PHASE 2: BALANCED SHIFT ASSIGNMENT (FILL ALL SHIFTS WITH ROUND-ROBIN)
      // NO FALLBACK - Only use attendants with matching oversight
      console.log('📅 Phase 3: Filling ALL remaining shifts with balanced round-robin assignment...')
      
      let shiftAssignments = 0
      
      // Group ALL attendants by oversight (including already assigned ones for round-robin)
      const allAttendantsByOversight = new Map()
      const excludedAttendants: string[] = []
      
      console.log(`🔍 DEBUGGING: Processing ${eventSpecificAttendants.length} total attendants for Phase 3`)
      
      eventSpecificAttendants.forEach(attendant => {
        // Skip overseers/keymen
        const isOverseer = positions.some(pos => 
          pos.oversight?.some(o => o.overseer?.id === attendant.id)
        )
        const isKeyman = positions.some(pos => 
          pos.oversight?.some(o => o.keyman?.id === attendant.id)
        )
        
        if (isOverseer || isKeyman) {
          excludedAttendants.push(`${attendant.firstName} ${attendant.lastName} (${isOverseer ? 'Overseer' : 'Keyman'})`)
          console.log(`🚫 EXCLUDING: ${attendant.firstName} ${attendant.lastName} - is ${isOverseer ? 'Overseer' : 'Keyman'}`)
          return
        }
        
        const overseerId = attendant.overseer?.id || 'none'
        const keymanId = attendant.keyman?.id || 'none'
        const leadershipKey = `${overseerId}-${keymanId}`
        
        console.log(`✅ INCLUDING: ${attendant.firstName} ${attendant.lastName} - oversight: ${leadershipKey}`)
        
        if (!allAttendantsByOversight.has(leadershipKey)) {
          allAttendantsByOversight.set(leadershipKey, [])
        }
        allAttendantsByOversight.get(leadershipKey).push(attendant)
      })
      
      console.log(`🚫 TOTAL EXCLUDED: ${excludedAttendants.length} attendants:`, excludedAttendants)
      
      console.log(`📅 Attendant pools by oversight:`)
      allAttendantsByOversight.forEach((attendants, key) => {
        console.log(`   ${key}: ${attendants.length} attendants`)
        // Show detailed list for Darrell McCoy's group
        if (key.includes('Darrell') || attendants.some(a => a.overseer?.firstName === 'Darrell')) {
          console.log(`   🔍 DARRELL MCCOY ATTENDANTS:`)
          attendants.forEach((att, index) => {
            console.log(`      ${index + 1}. ${att.firstName} ${att.lastName} (overseer: ${att.overseer?.firstName || 'none'})`)
          })
        }
      })
      
      // Collect ALL unfilled shifts grouped by oversight
      const unfilledShiftsByOversight = new Map()
      
      positions.forEach(position => {
        if (!position.shifts || position.shifts.length === 0) return
        
        const positionOversight = position.oversight?.[0]
        const hasOversight = positionOversight?.overseer || positionOversight?.keyman
        
        // Include All Day shifts ONLY if position has oversight
        const shiftsToFill = hasOversight 
          ? position.shifts  // Include All Day if has oversight
          : position.shifts?.filter(shift => !shift.isAllDay) || []  // Exclude All Day if no oversight
        
        const positionOverseerId = positionOversight?.overseer?.id || 'none'
        const positionKeymanId = positionOversight?.keyman?.id || 'none'
        const positionLeadershipKey = `${positionOverseerId}-${positionKeymanId}`
        
        shiftsToFill.forEach(shift => {
          const currentAssignments = position.assignments?.filter(a => a.shift?.id === shift.id).length || 0
          if (currentAssignments === 0) {
            if (!unfilledShiftsByOversight.has(positionLeadershipKey)) {
              unfilledShiftsByOversight.set(positionLeadershipKey, [])
            }
            unfilledShiftsByOversight.get(positionLeadershipKey).push({
              position,
              shift,
              positionName: position.name,
              shiftName: shift.name
            })
          }
        })
      })
      
      console.log(`📅 Unfilled shifts by oversight:`)
      unfilledShiftsByOversight.forEach((shifts, key) => {
        console.log(`   ${key}: ${shifts.length} unfilled shifts`)
      })
      
      // ROUND-ROBIN ASSIGNMENT: Fill all shifts for each oversight group
      for (const [leadershipKey, unfilledShifts] of unfilledShiftsByOversight.entries()) {
        const availableAttendants = allAttendantsByOversight.get(leadershipKey) || []
        
        if (availableAttendants.length === 0) {
          console.log(`⚠️ No attendants available for oversight group: ${leadershipKey}`)
          continue
        }
        
        console.log(`🔄 Round-robin assignment for ${leadershipKey}: ${unfilledShifts.length} shifts, ${availableAttendants.length} attendants`)
        
        // ENHANCED ROUND-ROBIN: Fill all shifts with conflict detection
        console.log(`🔄 Starting smart balanced round-robin for ${leadershipKey}...`)
        
        // Track assignments per attendant to ensure balanced distribution
        // CRITICAL: Load existing assignments from database to prevent duplicates
        const attendantAssignments = new Map()
        availableAttendants.forEach(att => {
          // Get existing assignments for this attendant from the positions data
          const existingShifts = positions
            .flatMap(pos => pos.assignments || [])
            .filter(a => a.attendant?.id === att.id)
            .map(a => a.shift)
            .filter(s => s) // Remove nulls
          
          attendantAssignments.set(att.id, existingShifts)
          
          if (existingShifts.length > 0) {
            console.log(`📋 ${att.firstName} ${att.lastName} already has ${existingShifts.length} shifts (${existingShifts.filter(s => s.isAllDay).length} all-day)`)
          }
        })
        
        // SMART DISTRIBUTION: Calculate optimal max shifts per attendant
        const totalShiftsToFill = unfilledShifts.length
        const totalAttendants = availableAttendants.length
        const avgShiftsPerAttendant = totalShiftsToFill / totalAttendants
        
        // Calculate how many attendants should get 2 shifts vs 1 shift
        // Formula: If avg is 1.5, then 50% get 2 shifts, 50% get 1 shift
        const attendantsWithTwoShifts = Math.ceil((avgShiftsPerAttendant - 1) * totalAttendants)
        const attendantsWithOneShift = totalAttendants - attendantsWithTwoShifts
        
        console.log(`📊 Smart Distribution for ${leadershipKey}:`)
        console.log(`   Total shifts to fill: ${totalShiftsToFill}`)
        console.log(`   Total attendants: ${totalAttendants}`)
        console.log(`   Average: ${avgShiftsPerAttendant.toFixed(2)} shifts per attendant`)
        console.log(`   Target: ${attendantsWithOneShift} attendants with 1 shift, ${attendantsWithTwoShifts} attendants with 2 shifts`)
        
        // Calculate max shifts per attendant (usually 2, unless we need more)
        const maxShiftsPerAttendant = Math.ceil(avgShiftsPerAttendant)
        console.log(`   Max shifts per attendant: ${maxShiftsPerAttendant}`)
        
        // TWO-PASS SMART ASSIGNMENT to minimize conflicts
        // Pass 1: Give everyone 1 shift (spread across all time slots)
        // Pass 2: Give calculated number of attendants their 2nd shift
        
        console.log(`🎯 Starting TWO-PASS assignment strategy...`)
        
        // CRITICAL FIX: Sort shifts by POSITION first, then by time
        // This ensures each position gets filled completely before moving to next position
        const sortedShifts = [...unfilledShifts].sort((a, b) => {
          // First sort by position number
          const posNumDiff = (a.position.positionNumber || 0) - (b.position.positionNumber || 0)
          if (posNumDiff !== 0) return posNumDiff
          
          // Then sort by time within same position
          const aTime = a.shift.startTime || '00:00'
          const bTime = b.shift.startTime || '00:00'
          return aTime.localeCompare(bTime)
        })
        
        // PASS 1: Give everyone 1 shift first
        console.log(`📍 PASS 1: Assigning first shift to each attendant...`)
        let attendantIndex = 0
        let pass1Assignments = 0
        
        for (const shiftInfo of sortedShifts) {
          if (pass1Assignments >= totalAttendants) break // Everyone has 1 shift
          
          let assigned = false
          let attempts = 0
          
          while (!assigned && attempts < availableAttendants.length) {
            const attendant = availableAttendants[attendantIndex % availableAttendants.length]
            const attendantCurrentAssignments = attendantAssignments.get(attendant.id) || []
            
            // Skip if attendant already has a shift in Pass 1
            if (attendantCurrentAssignments.length > 0) {
              attendantIndex++
              attempts++
              continue
            }
            
            // Check for time conflicts (overlapping shifts + all-day restrictions)
            const hasConflict = attendantCurrentAssignments.some(existingShift => {
              // If attendant has an all-day shift, they can't take any other shift
              if (existingShift.isAllDay) {
                console.log(`⛔ ${attendant.firstName} ${attendant.lastName} has all-day shift, cannot assign more`)
                return true
              }
              
              // If new shift is all-day, attendant can't have any existing shifts
              if (shiftInfo.shift.isAllDay && attendantCurrentAssignments.length > 0) {
                console.log(`⛔ Cannot assign all-day shift to ${attendant.firstName} ${attendant.lastName} - already has shifts`)
                return true
              }
              
              const existingEnd = existingShift.endTime || '23:59'
              const newStart = shiftInfo.shift.startTime || '00:00'
              const existingStart = existingShift.startTime || '00:00'
              const newEnd = shiftInfo.shift.endTime || '23:59'
              
              // Check for direct time overlap
              return (existingEnd > newStart && existingStart < newEnd)
            })
            
            if (!hasConflict) {
              const response = await fetch(`/api/events/${eventId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  positionId: shiftInfo.position.id,
                  attendantId: attendant.id,
                  shiftId: shiftInfo.shift.id,
                  role: 'ATTENDANT'
                })
              })
              
              if (response.ok) {
                shiftAssignments++
                progressCount++
                pass1Assignments++
                
                // Update progress
                setAssignmentProgress(prev => ({
                  ...prev,
                  phase: 'Phase 2: Pass 1 - First Shift',
                  current: progressCount,
                  message: `Assigning first shift to each attendant (${pass1Assignments}/${totalAttendants})...`,
                  assignments: [...prev.assignments, `${attendant.firstName} ${attendant.lastName} → ${shiftInfo.positionName} (${shiftInfo.shiftName})`]
                }))
                
                attendantCurrentAssignments.push(shiftInfo.shift)
                attendantAssignments.set(attendant.id, attendantCurrentAssignments)
                assigned = true
                console.log(`✅ Pass 1: ${attendant.firstName} ${attendant.lastName} → ${shiftInfo.positionName} (${shiftInfo.shiftName})`)
              }
            }
            
            attendantIndex++
            attempts++
          }
        }
        
        console.log(`✅ Pass 1 complete: ${pass1Assignments} attendants have 1 shift each`)
        
        // PASS 2: Assign second shifts to calculated number of attendants
        console.log(`📍 PASS 2: Assigning second shifts to ${attendantsWithTwoShifts} attendants...`)
        console.log(`   Target: Assign ${attendantsWithTwoShifts} second shifts (stop when reached)`)
        
        // Get remaining shifts by checking our local tracking (attendantAssignments Map is the source of truth)
        const assignedShiftIds = new Set()
        attendantAssignments.forEach(shifts => {
          shifts.forEach(shift => assignedShiftIds.add(shift.id))
        })
        
        const remainingShifts = sortedShifts.filter(shiftInfo => !assignedShiftIds.has(shiftInfo.shift.id))
        
        console.log(`   Remaining shifts to assign: ${remainingShifts.length}`)
        
        attendantIndex = 0
        let pass2Assignments = 0
        let attendantsWithSecondShift = 0
        
        for (const shiftInfo of remainingShifts) {
          // CRITICAL: Stop when we've given the calculated number of attendants their 2nd shift
          if (attendantsWithSecondShift >= attendantsWithTwoShifts) {
            console.log(`⏹️  Pass 2 target reached: ${attendantsWithSecondShift} attendants have 2 shifts`)
            break
          }
          
          let assigned = false
          let attempts = 0
          
          while (!assigned && attempts < availableAttendants.length * 2) {
            const attendant = availableAttendants[attendantIndex % availableAttendants.length]
            const attendantCurrentAssignments = attendantAssignments.get(attendant.id) || []
            
            // STRICT: Skip if attendant already has 2 or more shifts
            if (attendantCurrentAssignments.length >= 2) {
              attendantIndex++
              attempts++
              continue
            }
            
            // STRICT: Only assign to attendants with exactly 1 shift (for their 2nd shift)
            if (attendantCurrentAssignments.length !== 1) {
              attendantIndex++
              attempts++
              continue
            }
            
            // CRITICAL FIX: Check if attendant already has a shift at this position
            // We want to spread attendants across different positions, not double up on same position
            const existingAssignmentsAtThisPosition = positions
              .filter(p => p.id === shiftInfo.position.id)
              .flatMap(p => p.assignments || [])
              .filter(a => a.attendant?.id === attendant.id)
            
            if (existingAssignmentsAtThisPosition.length > 0) {
              // Skip - attendant already has a shift at this position
              attendantIndex++
              attempts++
              continue
            }
            
            // Check for time conflicts
            const hasConflict = attendantCurrentAssignments.some(existingShift => {
              if (existingShift.isAllDay) return true
              if (shiftInfo.shift.isAllDay && attendantCurrentAssignments.length > 0) return true
              
              const existingEnd = existingShift.endTime || '23:59'
              const newStart = shiftInfo.shift.startTime || '00:00'
              const existingStart = existingShift.startTime || '00:00'
              const newEnd = shiftInfo.shift.endTime || '23:59'
              
              return (existingEnd > newStart && existingStart < newEnd)
            })
            
            if (!hasConflict) {
              const response = await fetch(`/api/events/${eventId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  positionId: shiftInfo.position.id,
                  attendantId: attendant.id,
                  shiftId: shiftInfo.shift.id,
                  role: 'ATTENDANT'
                })
              })
              
              if (response.ok) {
                shiftAssignments++
                progressCount++
                pass2Assignments++
                
                // Track that this attendant now has 2 shifts
                attendantCurrentAssignments.push(shiftInfo.shift)
                attendantAssignments.set(attendant.id, attendantCurrentAssignments)
                
                // CRITICAL: Increment counter when attendant reaches exactly 2 shifts
                if (attendantCurrentAssignments.length === 2) {
                  attendantsWithSecondShift++
                }
                
                // Update progress
                setAssignmentProgress(prev => ({
                  ...prev,
                  phase: 'Phase 2: Pass 2 - Second Shift',
                  current: progressCount,
                  message: `Assigning second shifts (${attendantsWithSecondShift}/${attendantsWithTwoShifts} attendants with 2 shifts)...`,
                  assignments: [...prev.assignments, `${attendant.firstName} ${attendant.lastName} → ${shiftInfo.positionName} (${shiftInfo.shiftName})`]
                }))
                
                assigned = true
                console.log(`✅ Pass 2: ${attendant.firstName} ${attendant.lastName} → ${shiftInfo.positionName} (${shiftInfo.shiftName}) [2nd shift - ${attendantsWithSecondShift}/${attendantsWithTwoShifts}]`)
              }
            }
            
            attendantIndex++
            attempts++
          }
        }
        
        console.log(`✅ Pass 2 complete: ${pass2Assignments} second shifts assigned`)
        
        // Log final distribution
        console.log(`📊 Final assignment distribution for ${leadershipKey}:`)
        attendantAssignments.forEach((assignments, attendantId) => {
          const attendant = availableAttendants.find(a => a.id === attendantId)
          if (assignments.length > 0) {
            console.log(`   ${attendant?.firstName} ${attendant?.lastName}: ${assignments.length} shifts`)
          }
        })
      }

      // Enhanced success message with all statistics
      const hierarchySuccessRate = assignmentCount > 0 ? Math.round((hierarchyMatches / assignmentCount) * 100) : 0
      const totalFinalAssignments = assignmentCount + shiftAssignments
      const unassignedShifts = (window as any).unassignedShifts || []
      
      // Calculate oversight statistics
      const positionsWithOversightCount = Array.from(positionsByLeadership.keys()).filter(key => key !== 'none-none').reduce((count, key) => {
        return count + (positionsByLeadership.get(key)?.length || 0)
      }, 0)
      const positionsWithoutOversightCount = positionsByLeadership.get('none-none')?.length || 0
      
      // CRITICAL: Calculate utilization and coverage warnings
      let warningMessages = []
      
      // Check attendant utilization by oversight group
      for (const [leadershipKey, attendantsInGroup] of attendantsByLeadership) {
        const totalAttendants = (attendantsByLeadership.get(leadershipKey) || []).length
        const positionsInGroup = positionsByLeadership.get(leadershipKey) || []
        const totalShiftsNeeded = positionsInGroup.reduce((sum, pos) => {
          const shifts = pos.shifts?.filter(s => !s.isAllDay) || []
          return sum + shifts.length
        }, 0)
        
        if (totalShiftsNeeded > 0 && attendantsInGroup.length > 0) {
          console.log(`📊 UTILIZATION: ${leadershipKey} - ${attendantsInGroup.length} attendants remaining, ${totalShiftsNeeded} shifts needed`)
          if (attendantsInGroup.length > totalShiftsNeeded * 0.5) {
            warningMessages.push(`⚠️ ${leadershipKey}: ${attendantsInGroup.length} unused attendants (${totalShiftsNeeded} shifts needed)`)
          }
        }
      }
      
      // Check for unfilled shifts
      let totalUnfilledShifts = 0
      for (const positionsGroup of positionsByLeadership.values()) {
        for (const position of positionsGroup) {
          const shifts = position.shifts?.filter(s => !s.isAllDay) || []
          for (const shift of shifts) {
            const assignments = position.assignments?.filter(a => a.shift?.id === shift.id).length || 0
            if (assignments === 0) {
              totalUnfilledShifts++
            }
          }
        }
      }
      
      if (totalUnfilledShifts > 0) {
        warningMessages.push(`🚨 ${totalUnfilledShifts} shifts remain unfilled - insufficient attendants!`)
      }
      
      // Calculate distribution statistics for final message
      const allAssignedAttendants = new Map()
      positions.forEach(pos => {
        pos.assignments?.forEach(a => {
          if (a.attendant) {
            const name = `${a.attendant.firstName} ${a.attendant.lastName}`
            allAssignedAttendants.set(name, (allAssignedAttendants.get(name) || 0) + 1)
          }
        })
      })
      
      const distributionCounts = new Map()
      allAssignedAttendants.forEach(count => {
        distributionCounts.set(count, (distributionCounts.get(count) || 0) + 1)
      })
      
      const with1Shift = distributionCounts.get(1) || 0
      const with2Shifts = distributionCounts.get(2) || 0
      const with3PlusShifts = Array.from(distributionCounts.keys()).filter(k => k >= 3).reduce((sum, k) => sum + (distributionCounts.get(k) || 0), 0)
      
      // Build final message with useful distribution info
      let finalMessage = `🎯 Oversight-Aware Auto-Assign Complete!\n\n` +
            `✅ Total Assignments: ${totalFinalAssignments}\n` +
            `👥 Attendants Used: ${allAssignedAttendants.size}\n\n` +
            `📊 Distribution:\n` +
            `   • ${with1Shift} attendants with 1 shift\n` +
            `   • ${with2Shifts} attendants with 2 shifts\n`
      
      if (with3PlusShifts > 0) {
        finalMessage += `   ⚠️ ${with3PlusShifts} attendants with 3+ shifts\n`
      }
      
      finalMessage += `\n💡 All assignments respect oversight boundaries - no cross-contamination!\n`
      
      if (unassignedShifts.length > 0) {
        finalMessage += `\n\n⚠️ UNASSIGNED SHIFTS (${unassignedShifts.length}): All attendants had time conflicts\n`
        unassignedShifts.slice(0, 5).forEach((shift: string) => {
          finalMessage += `   • ${shift}\n`
        })
        if (unassignedShifts.length > 5) {
          finalMessage += `   ... and ${unassignedShifts.length - 5} more\n`
        }
        finalMessage += `\n💡 Suggestion: Manually assign these shifts or adjust shift times to avoid conflicts`
      }
      
      // Clear unassigned shifts tracker
      delete (window as any).unassignedShifts
      
      alert(finalMessage)
      
      setAssignmentProgress(prev => ({
        ...prev,
        phase: 'Assignment Complete!',
        current: prev.total,
        message: `Successfully assigned ${totalFinalAssignments} shifts!`,
        assignments: [...prev.assignments, '🎉 All assignments completed successfully!']
      }))
      
      // Show completion for a moment before closing
      setTimeout(() => {
        setShowProgressModal(false)
        router.reload()
      }, 2000)
      
      return // Don't close modal immediately
    } catch (error) {
      console.error('Auto-assign error:', error)
      alert('Failed to auto-assign attendants')
    } finally {
      setIsSubmitting(false)
      setShowProgressModal(false)
      setAssignmentProgress({
        phase: '',
        current: 0,
        total: 0,
        message: '',
        assignments: []
      })
    }
  }

  // Get unassigned attendants count (excluding leadership roles)
  const getUnassignedCount = () => {
    const assignedAttendantIds = new Set()
    const leadershipAttendantIds = new Set()
    
    positions.forEach(position => {
      // Track assigned attendants
      position.assignments?.forEach(assignment => {
        if (assignment.attendant?.id) {
          assignedAttendantIds.add(assignment.attendant.id)
        }
      })
      
      // Track overseers and keymen from oversight array
      position.oversight?.forEach(oversight => {
        if (oversight.overseer?.id) {
          leadershipAttendantIds.add(oversight.overseer.id)
        }
        if (oversight.keyman?.id) {
          leadershipAttendantIds.add(oversight.keyman.id)
        }
      })
    })
    
    // Also check attendants who have Overseer or Keyman in their forms of service
    attendants.forEach(att => {
      const formsOfService = Array.isArray(att.formsOfService) 
        ? att.formsOfService 
        : typeof att.formsOfService === 'string' 
          ? JSON.parse(att.formsOfService) 
          : []
      
      if (formsOfService.includes('Overseer') || formsOfService.includes('Keyman')) {
        leadershipAttendantIds.add(att.id)
      }
      
      // Also check if user has OVERSEER or KEYMAN role
      if (att.users?.role === 'OVERSEER' || att.users?.role === 'KEYMAN') {
        leadershipAttendantIds.add(att.id)
      }
    })
    
    return attendants.filter(att => 
      att.isActive && 
      !assignedAttendantIds.has(att.id) && 
      !leadershipAttendantIds.has(att.id)
    ).length
  }
  
  // Get list of unassigned attendants (excluding leadership roles)
  const getUnassignedAttendants = () => {
    const assignedAttendantIds = new Set()
    const leadershipAttendantIds = new Set()
    
    positions.forEach(position => {
      // Track assigned attendants
      position.assignments?.forEach(assignment => {
        if (assignment.attendant?.id) {
          assignedAttendantIds.add(assignment.attendant.id)
        }
      })
      
      // Track overseers and keymen from oversight array
      position.oversight?.forEach(oversight => {
        if (oversight.overseer?.id) {
          leadershipAttendantIds.add(oversight.overseer.id)
        }
        if (oversight.keyman?.id) {
          leadershipAttendantIds.add(oversight.keyman.id)
        }
      })
    })
    
    // Also check attendants who have Overseer or Keyman in their forms of service
    attendants.forEach(att => {
      const formsOfService = Array.isArray(att.formsOfService) 
        ? att.formsOfService 
        : typeof att.formsOfService === 'string' 
          ? JSON.parse(att.formsOfService) 
          : []
      
      if (formsOfService.includes('Overseer') || formsOfService.includes('Keyman')) {
        leadershipAttendantIds.add(att.id)
      }
      
      // Also check if user has OVERSEER or KEYMAN role
      if (att.users?.role === 'OVERSEER' || att.users?.role === 'KEYMAN') {
        leadershipAttendantIds.add(att.id)
      }
    })
    
    return attendants.filter(att => 
      att.isActive && 
      !assignedAttendantIds.has(att.id) && 
      !leadershipAttendantIds.has(att.id)
    )
  }

  // Get session data
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  // Helper function to reload page while preserving showInactive state
  const reloadWithState = () => {
    // Store scroll position BEFORE any navigation
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    
    sessionStorage.setItem('positions_scroll_y', scrollY.toString())
    sessionStorage.setItem('positions_scroll_x', scrollX.toString())
    sessionStorage.setItem('positions_scroll_timestamp', Date.now().toString())
    
    // Use window.location.reload() to ensure sessionStorage persists
    window.location.reload()
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
                {canManageContent && selectedPositions.size > 0 && (
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
                
                {canManageContent && (
                  <button
                    onClick={handleAutoAssignOversightAware}
                    disabled={isSubmitting || getUnassignedCount() === 0}
                    className={`relative px-6 py-3 rounded-lg font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg ${
                      isSubmitting 
                        ? 'bg-blue-500 cursor-not-allowed' 
                        : getUnassignedCount() === 0
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 animate-pulse'
                    }`}
                    title={`Auto-assign ${getUnassignedCount()} available attendants with oversight awareness`}
                  >
                    <div className="flex items-center space-x-2">
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Assigning...</span>
                        </>
                      ) : getUnassignedCount() === 0 ? (
                        <>
                          <span>🎉</span>
                          <span>ALL ASSIGNED!</span>
                        </>
                      ) : (
                        <>
                          <span>🚨</span>
                          <span>SMART AUTO-ASSIGN</span>
                          <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-sm">
                            {getUnassignedCount()}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                )}
                
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
                
{canManageContent && (
                  <button
                    onClick={async () => {
                      if (!confirm('⚠️ Clear ALL assignments from ALL positions?\n\nThis will remove all attendant assignments but keep positions and shifts intact.\n\nThis action cannot be undone.')) {
                        return
                      }
                      try {
                        const response = await fetch(`/api/events/${eventId}/positions/clear-assignments`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        })
                        if (response.ok) {
                          const result = await response.json()
                          alert(`✅ Cleared ${result.deletedCount} assignments`)
                          router.reload()
                        } else {
                          alert('Failed to clear assignments')
                        }
                      } catch (error) {
                        console.error('Clear assignments error:', error)
                        alert('Failed to clear assignments')
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    title="Remove all attendant assignments from all positions"
                  >
                    🧹 Clear All Assignments
                  </button>
                )}
                
                {canManageContent && (
                  <button
                    onClick={async () => {
                      if (!confirm('⚠️ Clear ALL shifts from ALL positions?\n\nThis will remove all shifts AND their assignments.\n\nThis action cannot be undone.')) {
                        return
                      }
                      try {
                        const response = await fetch(`/api/events/${eventId}/positions/clear-shifts`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        })
                      if (response.ok) {
                        const result = await response.json()
                        alert(`✅ Cleared ${result.deletedShifts} shifts and ${result.deletedAssignments} assignments`)
                        router.reload()
                      } else {
                        alert('Failed to clear shifts')
                      }
                    } catch (error) {
                      console.error('Clear shifts error:', error)
                      alert('Failed to clear shifts')
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  title="Remove all shifts and their assignments from all positions"
                >
                  🗑️ Clear All Shifts
                </button>
                )}
                
                {canManageContent && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Positions</p>
                  <p className="text-3xl font-bold text-gray-900">{positions.filter(p => p.isActive).length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
              </div>
            </div>
            {(() => {
              const totalShifts = positions.filter(p => p.isActive).reduce((sum, pos) => sum + (pos.shifts?.length || 0), 0)
              const assignedShifts = positions.filter(p => p.isActive).reduce((sum, pos) => {
                return sum + (pos.shifts?.filter(shift => {
                  const shiftAssignments = pos.assignments?.filter(a => a.shift?.id === shift.id && a.role === 'ATTENDANT').length || 0
                  return shiftAssignments > 0
                }).length || 0)
              }, 0)
              const completionPercentage = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0
              
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Shift Coverage</p>
                      <p className="text-3xl font-bold text-gray-900">{assignedShifts}/{totalShifts}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        completionPercentage === 100 ? 'bg-green-500' : 
                        completionPercentage >= 80 ? 'bg-blue-500' : 
                        completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{completionPercentage}% Complete</p>
                </div>
              )
            })()}
            
            <div
              onClick={() => setShowAvailableAttendants(true)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer hover:border-purple-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Available Attendants</p>
                  <p className="text-3xl font-bold text-gray-900">{getUnassignedCount()}</p>
                  <p className="text-xs text-gray-400 mt-1">Click to view list</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {positions.filter(p => p.isActive).reduce((sum, p) => sum + (p.assignments?.filter(a => a.role === 'ATTENDANT').length || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
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
                <p className="text-gray-500 mb-4">{canManageContent ? 'Create your first position to get started' : 'No positions have been created for this event yet'}</p>
                {canManageContent && (
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
                )}
              </div>
            ) : (
              positions.filter(p => showInactive ? true : p.isActive).map((position) => {
                // Calculate completion percentage for this position
                const totalShifts = position.shifts?.length || 0
                const assignedShifts = position.shifts?.filter(shift => {
                  const shiftAssignments = position.assignments?.filter(a => a.shift?.id === shift.id && a.role === 'ATTENDANT').length || 0
                  return shiftAssignments > 0
                }).length || 0
                const completionPercentage = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0
                
                return (
                <div key={position.id} className={`group relative rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                  position.isActive 
                    ? 'bg-white border border-gray-200 hover:border-blue-300' 
                    : 'bg-gray-50 border-2 border-dashed border-gray-300'
                } ${completionPercentage === 100 ? 'ring-2 ring-green-200' : ''}`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        {canManageContent && (
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
                        )}
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
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          position.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {position.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {/* Completion Badge */}
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          completionPercentage === 100 
                            ? 'bg-green-100 text-green-800' 
                            : completionPercentage > 0 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="text-xs">
                            {completionPercentage === 100 ? '✅' : completionPercentage > 0 ? '⏳' : '⭕'}
                          </span>
                          <span>{completionPercentage}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Assignment Progress</span>
                        <span>{assignedShifts}/{totalShifts} shifts filled</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            completionPercentage === 100 
                              ? 'bg-gradient-to-r from-green-500 to-green-600' 
                              : completionPercentage > 0 
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                : 'bg-gray-300'
                          }`}
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
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
                              <div key={shift.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-medium text-gray-700">
                                      {shift.name}
                                    </span>
                                    {!shift.isAllDay && (
                                      <span className="text-xs text-gray-500">
                                        {formatTime12Hour(shift.startTime || '')} - {formatTime12Hour(shift.endTime || '')}
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
                        {canManageContent && (
                          <button
                            onClick={() => {
                              setSelectedPosition(position)
                              setShowShiftModal(true)
                            }}
                            className="w-full text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-1 transition-colors"
                          >
                            + Create First Shift
                          </button>
                        )}
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
                    {canManageContent && (
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
                      {position.isActive ? (
                        <button
                          onClick={async () => {
                            if (!confirm(`Mark "${position.name}" as inactive? This will hide it from active view but preserve all data.`)) {
                              return
                            }
                            try {
                              const response = await fetch(`/api/events/${eventId}/positions/${position.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isActive: false }),
                              })
                              if (response.ok) {
                                router.reload()
                              } else {
                                alert('Failed to deactivate position')
                              }
                            } catch (error) {
                              alert('Failed to deactivate position')
                            }
                          }}
                          className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded transition-colors"
                        >
                          ⏸️ Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/events/${eventId}/positions/${position.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isActive: true }),
                              })
                              if (response.ok) {
                                router.reload()
                              } else {
                                alert('Failed to activate position')
                              }
                            } catch (error) {
                              alert('Failed to activate position')
                            }
                          }}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded transition-colors"
                        >
                          ▶️ Activate
                        </button>
                      )}
                        <button
                          onClick={() => handleDelete(position.id)}
                          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}

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
                                router.reload()
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
                                  router.reload()
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
                )
              })
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
                            setShiftFormData({ ...shiftFormData, name: 'Morning', startTime: '07:50', endTime: '10:00', isAllDay: false })
                          } else if (template === 'midday') {
                            setShiftFormData({ ...shiftFormData, name: 'Midday', startTime: '10:00', endTime: '12:00', isAllDay: false })
                          } else if (template === 'afternoon') {
                            setShiftFormData({ ...shiftFormData, name: 'Afternoon', startTime: '12:00', endTime: '14:00', isAllDay: false })
                          } else if (template === 'evening') {
                            setShiftFormData({ ...shiftFormData, name: 'Evening', startTime: '14:00', endTime: '17:00', isAllDay: false })
                          } else if (template === 'allday') {
                            setShiftFormData({ ...shiftFormData, name: 'All Day', startTime: '', endTime: '', isAllDay: true })
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shift Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={shiftFormData.name}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Morning, Evening, All Day"
                      />
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
                      Shift: {selectedShift.name} {!selectedShift.isAllDay && `(${formatTime12Hour(selectedShift.startTime || '')} - ${formatTime12Hour(selectedShift.endTime || '')})`}
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
                        // APEX GUARDIAN: Get oversight from position.oversight array
                        const oversight = selectedPosition.oversight && selectedPosition.oversight.length > 0 ? selectedPosition.oversight[0] : null
                        const positionOverseer = oversight?.overseer
                        const positionKeyman = oversight?.keyman
                        
                        // Filter attendants based on position's oversight
                        let filteredAttendants = attendants?.filter(att => att.isActive) || []
                        
                        // APEX GUARDIAN: Debug attendant data first
                        console.log(`🔍 DEBUGGING ATTENDANT DATA:`)
                        console.log(`   📊 Total attendants: ${attendants?.length || 0}`)
                        console.log(`   📊 Active attendants: ${filteredAttendants.length}`)
                        
                        // Log first few attendants to see their structure
                        filteredAttendants.slice(0, 5).forEach(attendant => {
                          console.log(`   👤 ${attendant.firstName} ${attendant.lastName}:`)
                          console.log(`      - overseerId: ${attendant.overseerId}`)
                          console.log(`      - keymanId: ${attendant.keymanId}`)
                          console.log(`      - overseer: ${attendant.overseer ? `${attendant.overseer.firstName} ${attendant.overseer.lastName}` : 'null'}`)
                          console.log(`      - keyman: ${attendant.keyman ? `${attendant.keyman.firstName} ${attendant.keyman.lastName}` : 'null'}`)
                        })
                        
                        // APEX GUARDIAN: EXACT overseer matching filtering
                        if (positionOverseer || positionKeyman) {
                          // Show ONLY attendants assigned to the SAME overseer/keyman as this position
                          const beforeFilter = filteredAttendants.length
                          filteredAttendants = filteredAttendants.filter(attendant => {
                            // Must match the exact overseer or keyman of this position
                            const matchesOverseer = positionOverseer && attendant.overseerId === positionOverseer.id
                            const matchesKeyman = positionKeyman && attendant.keymanId === positionKeyman.id
                            return matchesOverseer || matchesKeyman
                          })
                          
                          console.log(`🔍 Position oversight filtering (EXACT MATCH):`)
                          console.log(`   📍 Position: ${selectedPosition.name}`)
                          console.log(`   👥 Position Overseer: ${positionOverseer ? `${positionOverseer.firstName} ${positionOverseer.lastName} (${positionOverseer.id})` : 'None'}`)
                          console.log(`   👥 Position Keyman: ${positionKeyman ? `${positionKeyman.firstName} ${positionKeyman.lastName} (${positionKeyman.id})` : 'None'}`)
                          console.log(`   📊 Before filter: ${beforeFilter} attendants`)
                          console.log(`   📊 After exact match filter: ${filteredAttendants.length} attendants`)
                          
                          // Log which attendants are shown
                          if (filteredAttendants.length > 0) {
                            filteredAttendants.forEach(attendant => {
                              const attendantOverseerName = attendant.overseer ? `${attendant.overseer.firstName} ${attendant.overseer.lastName}` : 'None'
                              const attendantKeymanName = attendant.keyman ? `${attendant.keyman.firstName} ${attendant.keyman.lastName}` : 'None'
                              console.log(`   ✅ ${attendant.firstName} ${attendant.lastName}:`)
                              console.log(`      - Attendant Overseer: ${attendantOverseerName} (${attendant.overseerId || 'null'})`)
                              console.log(`      - Attendant Keyman: ${attendantKeymanName} (${attendant.keymanId || 'null'})`)
                            })
                          } else {
                            console.log(`   ❌ NO ATTENDANTS MATCH THIS POSITION'S OVERSIGHT!`)
                            console.log(`   💡 No attendants are assigned to ${positionOverseer ? positionOverseer.firstName + ' ' + positionOverseer.lastName : 'this overseer'} in the attendants page`)
                          }
                        } else {
                          console.log(`🔍 Position "${selectedPosition.name}" has no oversight - showing all active attendants`)
                        }
                        
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
                          {shift.name} {!shift.isAllDay && `(${formatTime12Hour(shift.startTime || '')} - ${formatTime12Hour(shift.endTime || '')})`}
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

        {/* Progress Modal */}
        {showProgressModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-11/12 md:w-2/3 lg:w-1/2 shadow-2xl rounded-xl bg-white">
              <div className="text-center">
                <div className="mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">🚀 Smart Auto-Assignment in Progress</h3>
                  <p className="text-gray-600">Intelligently matching attendants to positions with oversight awareness</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{assignmentProgress.phase}</span>
                    <span className="text-sm text-gray-500">
                      {assignmentProgress.current} / {assignmentProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${assignmentProgress.total > 0 ? (assignmentProgress.current / assignmentProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Assignment Feed */}
                {assignmentProgress.assignments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Recent Assignments</h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                      {assignmentProgress.assignments.slice(-5).map((assignment, index) => (
                        <div key={index} className="text-sm text-gray-700 mb-1 flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          {assignment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Message */}
                {assignmentProgress.message && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">{assignmentProgress.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Available Attendants Modal */}
        {showAvailableAttendants && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto border w-full max-w-2xl shadow-2xl rounded-xl bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">Available Attendants</h3>
                  <button
                    onClick={() => setShowAvailableAttendants(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  These attendants are active and not currently assigned to any positions or serving in oversight roles (overseers/keymen).
                </p>

                {(() => {
                  const availableAttendants = getUnassignedAttendants()

                  if (availableAttendants.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl mb-2 block">🎉</span>
                        <p>All attendants are currently assigned!</p>
                      </div>
                    )
                  }

                  return (
                    <div className="max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {availableAttendants.map((attendant, index) => (
                          <div
                            key={attendant.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {attendant.firstName} {attendant.lastName}
                                </p>
                                {attendant.congregation && (
                                  <p className="text-sm text-gray-500">{attendant.congregation}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Available
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowAvailableAttendants(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const timestamp = new Date().toISOString()
  console.log('🔍 ============================================')
  console.log('🔍 POSITIONS PAGE: getServerSideProps called at', timestamp)
  console.log('🔍 URL:', context.req.url)
  console.log('🔍 Params:', JSON.stringify(context.params))
  console.log('🔍 ============================================')
  
  try {
    console.log('🔍 Step 1: Getting session...')
    const session = await getServerSession(context.req, context.res, authOptions)
    console.log('🔍 Step 1a: Session exists?', !!session)
    console.log('🔍 Step 1b: Session user:', session?.user?.email || 'NO USER')
  
    if (!session) {
      console.log('🔍 Step 1c: NO SESSION - Redirecting to signin')
      return {
        redirect: {
          destination: '/auth/signin',
        },
      }
    }
    console.log('🔍 Step 1d: Session validated, continuing...')

    // CRITICAL: Block attendants from accessing admin pages
    if (session.user?.role === 'ATTENDANT') {
      console.log('🔍 Step 1e: ATTENDANT ROLE - Redirecting to attendant dashboard')
      return {
        redirect: {
          destination: '/attendant/dashboard',
          permanent: false,
        },
      }
    }

    // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN can access
    if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(session.user?.role || '')) {
      console.log('🔍 Step 1f: INVALID ROLE - Redirecting to signin')
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
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

    // Attach oversight data to positions and rename position_assignments to assignments for client compatibility
    const positionsWithOversight = (eventData as any)!.positions.map((position: any) => {
      const positionOversight = oversightData
        .filter((oversight: any) => oversight.positionId === position.id)
        .map((oversight: any) => ({
          id: oversight.id,
          overseer: oversight.overseer,
          keyman: oversight.keyman
        }))
      
      // Assignments and shifts are already correctly named from the schema
      return {
        ...position,
        oversight: positionOversight
      }
    })
    console.log('🔍 Step 10: Positions with oversight attached')

    console.log('🔍 Step 11: Fetching attendants data with event-specific oversight...')
    
    // Get all active attendants with their user role
    const allAttendants = await prisma.attendants.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        formsOfService: true,
        congregation: true,
        isActive: true,
        users: {
          select: {
            role: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    // Get event-attendant associations for oversight assignments (SOURCE OF TRUTH)
    const eventAssociations = await prisma.event_attendants.findMany({
      where: {
        eventId: id as string
      },
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

    // Create association map for quick lookup
    const associationMap = new Map()
    eventAssociations.forEach(assoc => {
      if (assoc.attendantId) {
        associationMap.set(assoc.attendantId, assoc)
      }
    })

    // Merge attendants with their event-specific oversight assignments
    const attendantsData = allAttendants.map(attendant => {
      const association = associationMap.get(attendant.id)
      return {
        ...attendant,
        overseerId: association?.overseerId || null,
        keymanId: association?.keymanId || null,
        overseer: association?.overseer || null,
        keyman: association?.keyman || null
      }
    })

    console.log('🔍 Step 11b: Event-specific attendant oversight loaded')
    console.log(`   📊 Total attendants: ${attendantsData.length}`)
    console.log(`   📊 Event associations: ${eventAssociations.length}`)
    const attendantsWithOversight = attendantsData.filter(att => att.overseerId)
    console.log(`   📊 Attendants with overseers: ${attendantsWithOversight.length}`)
    
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

    // Transform positions data - REMOVED: Using positionsWithOversight directly instead
    // This code was causing crashes because eventData.positions typing issue

    // APEX GUARDIAN: Debug positions data loading
    console.log('🔍 Step 12: Final positions with oversight count:', positionsWithOversight.length)
    const positionsWithOversightData = positionsWithOversight.filter((p: any) => p.oversight && p.oversight.length > 0)
    console.log('🔍 Step 13: Positions that have oversight data:', positionsWithOversightData.length)
    positionsWithOversightData.forEach((p: any) => {
      console.log(`🔍 Position ${p.positionNumber} oversight:`, p.oversight)
    })

    // Check event-specific permissions
    const { canManageAttendants } = await import('../../../src/lib/eventAccess')
    const userId = session.user?.id || ''
    const canManageContent = await canManageAttendants(userId, id as string)

    return {
      props: {
        eventId: id as string,
        event,
        positions: positionsWithOversight,
        attendants: attendantsData,
        stats: {
          total: positionsWithOversight.length,
          active: positionsWithOversight.filter((p: any) => p.isActive).length,
          assigned: positionsWithOversight.filter((p: any) => p.assignments && p.assignments.length > 0).length
        },
        canManageContent
      }
    }

  } catch (error) {
    console.error('Error fetching event data:', error)
    return {
      notFound: true
    }
  }
}
