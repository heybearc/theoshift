/**
 * PHASE 4A: Visual Position Grid View
 * Enhanced position management with drag-and-drop assignment interface
 */

import React, { useState, useMemo } from 'react'
import { checkAttendantConflict, findAlternativeAttendants } from '../src/lib/conflictDetection'
import { sortShiftsByTime } from '../lib/shiftSort'

interface Shift {
  id: string
  name: string
  startTime?: string
  endTime?: string
  isAllDay: boolean
}

interface Assignment {
  id: string
  role: string
  volunteer: {
    id: string
    firstName: string
    lastName: string
  }
  shift?: Shift
}

interface Position {
  id: string
  positionNumber: number
  name: string
  positionName: string
  description?: string
  area?: string
  isActive: boolean
  shifts?: Shift[]
  assignments?: Assignment[]
}

interface Volunteer {
  id: string
  firstName: string
  lastName: string
  overseerId?: string | null
  keymanId?: string | null
}

interface PositionGridViewProps {
  positions: Position[]
  attendants: Volunteer[]
  eventId: string
  onAssign: (positionId: string, shiftId: string, attendantId: string) => Promise<void>
  onUnassign: (assignmentId: string) => Promise<void>
}

export default function PositionGridView({
  positions,
  attendants,
  eventId,
  onAssign,
  onUnassign
}: PositionGridViewProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [selectedShift, setSelectedShift] = useState<string | null>(null)
  const [draggedAttendant, setDraggedAttendant] = useState<string | null>(null)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictDetails, setConflictDetails] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Calculate statistics
  const stats = useMemo(() => {
    const activePositions = positions.filter(p => p.isActive)
    const totalShifts = activePositions.reduce((sum, p) => sum + (p.shifts?.length || 0), 0)
    const assignedShifts = activePositions.reduce((sum, p) => {
      return sum + (p.assignments?.length || 0)
    }, 0)
    const fillRate = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0

    return {
      totalPositions: activePositions.length,
      totalShifts,
      assignedShifts,
      unassignedShifts: totalShifts - assignedShifts,
      fillRate
    }
  }, [positions])

  // Get all existing assignments for conflict detection
  const allAssignments = useMemo(() => {
    return positions.flatMap(p => 
      (p.assignments || []).map(a => ({
        id: a.id,
        attendantId: a.volunteer.id,
        positionId: p.id,
        eventId: eventId,
        shift: a.shift ? {
          startTime: a.shift.startTime || '',
          endTime: a.shift.endTime || '',
          isAllDay: a.shift.isAllDay
        } : undefined,
        attendant: a.volunteer
      }))
    )
  }, [positions, eventId])

  // Handle drag start
  const handleDragStart = (attendantId: string) => {
    setDraggedAttendant(attendantId)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle drop on shift
  const handleDrop = async (positionId: string, shiftId: string) => {
    if (!draggedAttendant) return

    const position = positions.find(p => p.id === positionId)
    const shift = position?.shifts?.find(s => s.id === shiftId)

    if (!shift) return

    // Check for conflicts
    const conflict = checkAttendantConflict(
      draggedAttendant,
      {
        startTime: shift.startTime || '',
        endTime: shift.endTime || '',
        isAllDay: shift.isAllDay
      },
      eventId,
      allAssignments
    )

    if (conflict.hasConflict) {
      setConflictDetails({
        attendant: attendants.find(a => a.id === draggedAttendant),
        shift,
        position,
        conflict
      })
      setShowConflictModal(true)
      setDraggedAttendant(null)
      return
    }

    // No conflict, proceed with assignment
    try {
      await onAssign(positionId, shiftId, draggedAttendant)
    } catch (error) {
      console.error('Assignment failed:', error)
    }

    setDraggedAttendant(null)
  }

  // Get shift status
  const getShiftStatus = (position: Position, shift: Shift) => {
    const assignment = position.assignments?.find(a => a.shift?.id === shift.id)
    if (assignment) {
      return {
        status: 'assigned',
        attendant: assignment.volunteer,
        assignmentId: assignment.id
      }
    }
    return { status: 'empty' }
  }

  // Format time
  const formatTime = (time?: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${hour12}:${minutes} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Position Assignment Grid</h2>
            <p className="text-blue-100 mt-1">Drag attendants to assign positions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.totalPositions}</div>
            <div className="text-blue-100 text-sm">Active Positions</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.totalShifts}</div>
            <div className="text-blue-100 text-sm">Total Shifts</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.assignedShifts}</div>
            <div className="text-blue-100 text-sm">Assigned</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.fillRate}%</div>
            <div className="text-blue-100 text-sm">Fill Rate</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Available Attendants Panel */}
        <div className="col-span-3 bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Available Attendants</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {attendants.map(attendant => {
              const assignmentCount = allAssignments.filter(
                a => a.attendantId === attendant.id
              ).length
              
              return (
                <div
                  key={attendant.id}
                  draggable
                  onDragStart={() => handleDragStart(attendant.id)}
                  className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 cursor-move hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="font-medium text-gray-800">
                    {attendant.firstName} {attendant.lastName}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {assignmentCount > 0 ? `${assignmentCount} assignment${assignmentCount > 1 ? 's' : ''}` : 'No assignments'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Position Grid */}
        <div className="col-span-9">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4">
              {positions.filter(p => p.isActive).map(position => (
                <div
                  key={position.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-gray-700 to-gray-600 text-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-300">
                          Position #{position.positionNumber}
                        </div>
                        <div className="text-xl font-bold">{position.positionName}</div>
                        {position.area && (
                          <div className="text-sm text-gray-300 mt-1">
                            Area: {position.area}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {position.assignments?.length || 0}/{position.shifts?.length || 0}
                        </div>
                        <div className="text-xs text-gray-300">Filled</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3">
                      {sortShiftsByTime(position.shifts).map(shift => {
                        const shiftStatus = getShiftStatus(position, shift)
                        
                        return (
                          <div
                            key={shift.id}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(position.id, shift.id)}
                            className={`border-2 rounded-lg p-3 transition-all ${
                              shiftStatus.status === 'assigned'
                                ? 'border-green-300 bg-green-50'
                                : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            <div className="font-medium text-gray-800 text-sm mb-2">
                              {shift.name}
                            </div>
                            {shift.isAllDay ? (
                              <div className="text-xs text-gray-500">All Day</div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                              </div>
                            )}
                            
                            {shiftStatus.status === 'assigned' && shiftStatus.attendant ? (
                              <div className="mt-2 pt-2 border-t border-green-200">
                                <div className="text-sm font-medium text-green-800">
                                  {shiftStatus.attendant.firstName} {shiftStatus.attendant.lastName}
                                </div>
                                <button
                                  onClick={() => onUnassign(shiftStatus.assignmentId!)}
                                  className="text-xs text-red-600 hover:text-red-800 mt-1"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-400 italic">
                                  Drop attendant here
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="space-y-4">
                {positions.filter(p => p.isActive).map(position => (
                  <div key={position.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-gray-500">
                          Position #{position.positionNumber}
                        </span>
                        <h4 className="text-lg font-bold text-gray-800">
                          {position.positionName}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-800">
                          {position.assignments?.length || 0}/{position.shifts?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">Filled</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {sortShiftsByTime(position.shifts).map(shift => {
                        const shiftStatus = getShiftStatus(position, shift)
                        return (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between bg-gray-50 rounded p-2"
                          >
                            <div>
                              <span className="font-medium text-gray-800">{shift.name}</span>
                              <span className="text-sm text-gray-500 ml-2">
                                {shift.isAllDay ? 'All Day' : `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`}
                              </span>
                            </div>
                            {shiftStatus.status === 'assigned' && shiftStatus.attendant ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-700">
                                  {shiftStatus.attendant.firstName} {shiftStatus.attendant.lastName}
                                </span>
                                <button
                                  onClick={() => onUnassign(shiftStatus.assignmentId!)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Unassigned</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Modal */}
      {showConflictModal && conflictDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Assignment Conflict</h3>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700">
                <strong>{conflictDetails.attendant?.firstName} {conflictDetails.attendant?.lastName}</strong> cannot be assigned to this shift.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">{conflictDetails.conflict.message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConflictModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConflictModal(false)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Find Alternatives
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
