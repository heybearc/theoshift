import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import EventPageWrapper from '../../../components/EventPageWrapper'
import BulkPositionCreator from '../../../components/BulkPositionCreator'
import PositionGridView from '../../../components/PositionGridView'
import { AutoAssignmentEngine } from '../../../lib/autoAssignmentEngine'
import { createPositionService } from '../../../lib/positionService'
import { exportService } from '../../../lib/exportService'
import { usePositions } from '../../../hooks/usePositions'
import { useAssignments } from '../../../hooks/useAssignments'
import { useBulkOperations } from '../../../hooks/useBulkOperations'
import { useShifts } from '../../../hooks/useShifts'
import { useOversight } from '../../../hooks/useOversight'
import { useExport } from '../../../hooks/useExport'
import { buildVolunteerAssignmentMap, getConflictsForShift } from '../../../hooks/useConflicts'
import CreatePositionModal from '../../../components/CreatePositionModal'
import ShiftModal from '../../../components/ShiftModal'
import OverseerModal from '../../../components/OverseerModal'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../api/auth/[...nextauth]'
import crypto from 'crypto'
import { notifyAlert, toast } from '../../../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../../../lib/ui/confirm'
import {
  abortEventBulkEmail,
  formatBulkEmailConfirmMessage,
} from '../../../lib/bulkEmailClient'
import {
  countShiftAssignments,
  getPositionSlotFillRatio,
  getShiftVolunteersNeeded,
  clampVolunteersNeeded
} from '../../../lib/shiftCapacity'
import { sortShiftsByTime } from '../../../lib/shiftSort'
import { shiftsConflict, toDateKey } from '../../../lib/shiftConflict'
import { enumerateEventDateKeys, formatEventDayLabel, isMultiDayEvent } from '../../../lib/eventDates'
import { volunteerRosterWhere } from '@/lib/volunteerRoster'
import ShiftInlineEditor from '../../../components/ShiftInlineEditor'

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
    volunteersNeeded?: number
    shiftDate?: string | null
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

interface Volunteer {
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
  isOverseer?: boolean
  isKeyman?: boolean
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
// Type alias for Attendant
type Attendant = Volunteer

// ============================================================================
// AssignVolunteerModal - Conflict-aware volunteer assignment modal
// ============================================================================

type AssignmentRole = 'VOLUNTEER' | 'OVERSEER' | 'KEYMAN'

interface AssignVolunteerModalProps {
  position: Position
  selectedShift: any | null
  filteredAttendants: Attendant[]
  allPositions: Position[]
  eventId: string
  eventDateKeys?: string[]
  initialRole?: AssignmentRole
  /** When set, list sorts matching oversight first and labels others */
  preferredOverseerId?: string | null
  preferredKeymanId?: string | null
  onClose: () => void
  onSuccess: () => void
  formatTime: (t: string) => string
}

function AssignVolunteerModal({
  position,
  selectedShift,
  filteredAttendants,
  allPositions,
  eventId,
  eventDateKeys = [],
  initialRole = 'VOLUNTEER',
  preferredOverseerId = null,
  preferredKeymanId = null,
  onClose,
  onSuccess,
  formatTime
}: AssignVolunteerModalProps) {
  const [selectedVolunteerId, setSelectedVolunteerId] = React.useState('')
  const [selectedShiftId, setSelectedShiftId] = React.useState(selectedShift?.id || '')
  const [selectedRole, setSelectedRole] = React.useState<AssignmentRole>(initialRole)
  const [search, setSearch] = React.useState('')
  const [inlineError, setInlineError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [localShifts, setLocalShifts] = React.useState(() => position.shifts || [])
  const [editingTimes, setEditingTimes] = React.useState(false)
  const [savingTimes, setSavingTimes] = React.useState(false)

  const roleLabel =
    selectedRole === 'OVERSEER' ? 'Overseer' : selectedRole === 'KEYMAN' ? 'Keyman' : 'Volunteer'

  const matchesPreferredOversight = (attendant: Attendant) => {
    if (!preferredOverseerId && !preferredKeymanId) return true
    const matchesOverseer = preferredOverseerId && attendant.overseerId === preferredOverseerId
    const matchesKeyman = preferredKeymanId && attendant.keymanId === preferredKeymanId
    return Boolean(matchesOverseer || matchesKeyman)
  }

  // Build assignment map once from all positions data
  const assignmentMap = React.useMemo(
    () => buildVolunteerAssignmentMap(allPositions),
    [allPositions]
  )

  // Recompute conflict map whenever the selected shift changes
  const activeShift = React.useMemo(() => {
    if (!selectedShiftId) return localShifts[0] || null
    return localShifts.find(s => s.id === selectedShiftId) || null
  }, [selectedShiftId, localShifts])

  const assigneeCount = React.useMemo(() => {
    if (!activeShift?.id) return 0
    return (position.assignments || []).filter((a) => a.shift?.id === activeShift.id).length
  }, [activeShift?.id, position.assignments])

  const conflictMap = React.useMemo(
    () => getConflictsForShift(filteredAttendants.map(a => a.id), activeShift, assignmentMap),
    [filteredAttendants, activeShift, assignmentMap]
  )

  const conflict = selectedVolunteerId ? conflictMap.get(selectedVolunteerId) : null

  const visibleAttendants = filteredAttendants.filter(a => {
    if (!search) return true
    const full = `${a.firstName} ${a.lastName} ${a.congregation || ''}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  // Sort: preferred oversight first, then no-conflict, then conflict
  const sorted = [...visibleAttendants].sort((a, b) => {
    const aPref = matchesPreferredOversight(a) ? 0 : 1
    const bPref = matchesPreferredOversight(b) ? 0 : 1
    if (aPref !== bPref) return aPref - bPref
    const ac = conflictMap.get(a.id)?.hasConflict ? 1 : 0
    const bc = conflictMap.get(b.id)?.hasConflict ? 1 : 0
    if (ac !== bc) return ac - bc
    return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
  })

  const handleSaveShiftTimes = async (values: {
    name: string
    startTime: string
    endTime: string
    isAllDay: boolean
    volunteersNeeded: number
    shiftDate: string | null
  }) => {
    if (!activeShift) return
    if (assigneeCount > 0) {
      const confirmed = await appConfirm({
        title: 'Update shift times',
        message: `This updates times for ${assigneeCount} assigned volunteer${
          assigneeCount === 1 ? '' : 's'
        } on this shift. Continue?`,
        confirmLabel: 'Update times',
        cancelLabel: 'Cancel',
      })
      if (!confirmed) return
    }

    setSavingTimes(true)
    setInlineError(null)
    try {
      const positionService = createPositionService(eventId)
      const ok = await positionService.updateShift(position.id, activeShift.id, {
        name: values.name,
        startTime: values.isAllDay ? null : values.startTime || null,
        endTime: values.isAllDay ? null : values.endTime || null,
        isAllDay: values.isAllDay,
        volunteersNeeded: values.volunteersNeeded,
        shiftDate: values.shiftDate,
      })
      if (!ok) {
        setInlineError('Failed to update shift times.')
        return
      }
      setLocalShifts((prev) =>
        prev.map((s) =>
          s.id === activeShift.id
            ? {
                ...s,
                name: values.name,
                startTime: values.isAllDay ? undefined : values.startTime,
                endTime: values.isAllDay ? undefined : values.endTime,
                isAllDay: values.isAllDay,
                volunteersNeeded: values.volunteersNeeded,
                shiftDate: values.shiftDate,
              }
            : s
        )
      )
      setEditingTimes(false)
      toast.success('Shift times updated')
    } catch {
      setInlineError('Failed to update shift times.')
    } finally {
      setSavingTimes(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInlineError(null)

    if (!selectedVolunteerId) { setInlineError('Please select a volunteer.'); return }
    if (!selectedShiftId) { setInlineError('Please select a shift.'); return }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: position.id,
          volunteerId: selectedVolunteerId,
          shiftId: selectedShiftId,
          role: selectedRole
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        if (response.status === 409) {
          if (errorData.conflictType === 'TIME_OVERLAP') {
            const details = errorData.conflicts?.map((c: any) => `${c.positionName} — ${c.shiftName}`).join(', ')
            setInlineError(`Time conflict: volunteer is already assigned to ${details}.`)
          } else if (errorData.conflictType === 'ALL_DAY_CONFLICT') {
            setInlineError(errorData.message || 'All-day shift conflict.')
          } else if (errorData.conflictType === 'DUPLICATE_SHIFT_ASSIGNMENT') {
            setInlineError('This volunteer is already assigned to this shift.')
          } else if (errorData.conflictType === 'ROLE_OCCUPIED') {
            setInlineError(errorData.message || 'This role is already filled for this shift.')
          } else {
            setInlineError(errorData.message || 'Assignment conflict — unable to assign.')
          }
        } else {
          setInlineError(errorData.error || `Failed to assign ${roleLabel.toLowerCase()}.`)
        }
      }
    } catch {
      setInlineError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-[min(100%-1.5rem,28rem)] shadow-lg rounded-md bg-white mb-8">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Assign {roleLabel}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{position.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Role selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={selectedRole}
                onChange={e => { setSelectedRole(e.target.value as AssignmentRole); setInlineError(null) }}
                className="w-full px-3 py-2 min-h-[44px] text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="VOLUNTEER">Volunteer</option>
                <option value="OVERSEER">Overseer (this shift)</option>
                <option value="KEYMAN">Keyman (this shift)</option>
              </select>
              {selectedRole !== 'VOLUNTEER' && (
                <p className="text-xs text-gray-500 mt-1">
                  Each shift can have one overseer and one keyman.
                </p>
              )}
            </div>

            {/* Shift selector + in-place time edit */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-sm font-medium text-gray-700">Shift</label>
                {activeShift && !editingTimes && (
                  <button
                    type="button"
                    onClick={() => setEditingTimes(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 min-h-[44px] px-2 touch-manipulation"
                  >
                    Edit times
                  </button>
                )}
              </div>
              <select
                value={selectedShiftId}
                onChange={e => {
                  setSelectedShiftId(e.target.value)
                  setEditingTimes(false)
                  setInlineError(null)
                }}
                className="w-full px-3 py-2 min-h-[44px] text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a shift...</option>
                {localShifts.map(shift => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}{!shift.isAllDay && shift.startTime ? ` (${formatTime(shift.startTime)} – ${formatTime(shift.endTime || '')})` : shift.isAllDay ? ' (All Day)' : ''}
                  </option>
                ))}
              </select>
              {activeShift && !editingTimes && (
                <p className="text-xs text-gray-500 mt-1">
                  {activeShift.isAllDay
                    ? 'All day'
                    : `${formatTime(activeShift.startTime || '')} – ${formatTime(activeShift.endTime || '')}`}
                  {assigneeCount > 0 ? ` · ${assigneeCount} already assigned` : ''}
                  {' · '}Times are shared for everyone on this shift.
                </p>
              )}
              {editingTimes && activeShift && (
                <ShiftInlineEditor
                  initial={{
                    name: activeShift.name || '',
                    startTime: activeShift.startTime || '',
                    endTime: activeShift.endTime || '',
                    isAllDay: !!activeShift.isAllDay,
                    volunteersNeeded: getShiftVolunteersNeeded(activeShift),
                    shiftDate: toDateKey(activeShift.shiftDate),
                  }}
                  eventDateKeys={eventDateKeys}
                  saving={savingTimes}
                  onCancel={() => setEditingTimes(false)}
                  onSave={handleSaveShiftTimes}
                />
              )}
            </div>

            {/* Volunteer search */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
              <input
                type="text"
                placeholder="Search by name or congregation..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(preferredOverseerId || preferredKeymanId) && selectedRole === 'VOLUNTEER' && (
                <p className="text-xs text-gray-500 mt-1">
                  Matching overseer/keyman listed first. Others are available for capacity overflow.
                </p>
              )}
            </div>

            {/* Volunteer list */}
            <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md mb-4">
              {sorted.length === 0 ? (
                <p className="text-sm text-gray-500 p-3 text-center">No volunteers found</p>
              ) : (
                sorted.map(attendant => {
                  const c = conflictMap.get(attendant.id)
                  const hasConflict = c?.hasConflict
                  const isSelected = selectedVolunteerId === attendant.id
                  const isPreferred = matchesPreferredOversight(attendant)
                  return (
                    <button
                      key={attendant.id}
                      type="button"
                      onClick={() => { setSelectedVolunteerId(attendant.id); setInlineError(null) }}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors border-b border-gray-100 last:border-0 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900 block truncate">
                          {attendant.firstName} {attendant.lastName}
                        </span>
                        {attendant.congregation && (
                          <span className="text-xs text-gray-500">{attendant.congregation}</span>
                        )}
                        {hasConflict && isSelected && (
                          <span className="text-xs text-amber-700 block mt-0.5">{c!.message}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {!isPreferred && selectedRole === 'VOLUNTEER' && (preferredOverseerId || preferredKeymanId) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            Other group
                          </span>
                        )}
                        {hasConflict && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            Conflict
                          </span>
                        )}
                        {isSelected && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Conflict warning (selected volunteer has conflict) */}
            {conflict?.hasConflict && !inlineError && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">Scheduling conflict</p>
                  <p className="text-xs text-amber-700 mt-0.5">{conflict.message}</p>
                  <p className="text-xs text-amber-600 mt-1">You can still assign — coordinators can override conflicts.</p>
                </div>
              </div>
            )}

            {/* Inline error from API */}
            {inlineError && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-sm text-red-700">{inlineError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedVolunteerId || !selectedShiftId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm rounded-md transition-colors"
              >
                {submitting ? 'Assigning...' : `Assign ${roleLabel}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ============================================================================

interface EventPositionsProps {
  eventId: string
  event: Event
  positions: Position[]
  attendants: Attendant[]
  stats: Stats
  canManageContent: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  moduleConfig?: any
  terminology?: any
}
export default function EventPositionsPage({ eventId, event, positions: initialPositions, attendants, stats, canManageContent, canEdit, canDelete, canManagePermissions, moduleConfig, terminology }: EventPositionsProps) {
  const router = useRouter()
  
  // Initialize services
  const positionService = React.useMemo(() => createPositionService(eventId), [eventId])
  
  // Custom hooks for state management
  const positionsHook = usePositions({ eventId, initialPositions })
  const assignmentsHook = useAssignments({ eventId })
  const bulkOpsHook = useBulkOperations({ 
    eventId, 
    selectedPositions: positionsHook.selectedPositions,
    positions: positionsHook.positions 
  })
  const shiftsHook = useShifts({ eventId })
  const oversightHook = useOversight({ eventId })
  
  // Remaining local state (not yet extracted to hooks)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBulkCreator, setShowBulkCreator] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [assignmentProgress, setAssignmentProgress] = useState({
    phase: '',
    current: 0,
    total: 0,
    message: '',
    assignments: [] as Array<{attendant: string, position: string, shift: string}>
  })
  const [bulkCreateResults, setBulkCreateResults] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [showAvailableAttendants, setShowAvailableAttendants] = useState(false)
  const [selectedOverseer, setSelectedOverseer] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'overseers' | 'assistants' | 'keymen'>('all')
  // Initialize viewMode from localStorage if available
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('positions-view-mode')
      return (saved === 'list' || saved === 'grid') ? saved : 'list'
    }
    return 'list'
  })
  const [showFiltersMenu, setShowFiltersMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [bulkEmailJobKind, setBulkEmailJobKind] = useState<'assignment-notifications' | null>(
    null
  )
  const [assignmentNotifySending, setAssignmentNotifySending] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [savingShiftId, setSavingShiftId] = useState<string | null>(null)
  const [assignModalRole, setAssignModalRole] = useState<AssignmentRole>('VOLUNTEER')

  // Persist viewMode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('positions-view-mode', viewMode)
    }
  }, [viewMode])

  // Track screen size and prevent "grid" mode on small screens (PositionGridView is desktop-oriented)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)') // < lg

    const sync = () => {
      const small = mq.matches
      setIsSmallScreen(small)
      if (small && viewMode === 'grid') setViewMode('list')
    }

    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [viewMode])

  // Restore scroll position after content loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedScrollPos = sessionStorage.getItem('positions-scroll-pos')
      if (savedScrollPos) {
        // Wait for content to render, then restore scroll position
        const restoreScroll = () => {
          const scrollPos = parseInt(savedScrollPos, 10)
          window.scrollTo(0, scrollPos)
          sessionStorage.removeItem('positions-scroll-pos')
        }
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          setTimeout(restoreScroll, 300)
        })
      }
    }
  }, [positionsHook.positions])

  // Save scroll position before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('positions-scroll-pos', window.scrollY.toString())
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
  
  // Define getFilteredPositionsWithOverseer before using it in exportHook
  const getFilteredPositionsWithOverseer = () => {
    let filtered = positionsHook.getFilteredPositions()
    
    // Apply overseer filter
    if (selectedOverseer !== 'all') {
      filtered = filtered.filter(position => 
        position.oversight?.some(o => o.overseer?.id === selectedOverseer)
      )
    }
    
    // Apply role filter (Phase 5B: Oversight Role Filtering)
    // PositionRole is OVERSEER | KEYMAN | VOLUNTEER | ATTENDANT — not ASSISTANT_OVERSEER.
    // "Assistants" = volunteer assignment where linked user account is ASSISTANT_OVERSEER.
    if (roleFilter !== 'all') {
      filtered = filtered.filter(position => {
        const assignments = position.assignments || []

        if (roleFilter === 'overseers') {
          return assignments.some(a => a.role === 'OVERSEER')
        }
        if (roleFilter === 'assistants') {
          return assignments.some(
            a =>
              (a.role === 'VOLUNTEER' || a.role === 'ATTENDANT') &&
              (a.volunteer as { user?: { role?: string } } | undefined)?.user?.role ===
                'ASSISTANT_OVERSEER'
          )
        }
        if (roleFilter === 'keymen') {
          return assignments.some(a => a.role === 'KEYMAN')
        }

        return true
      })
    }
    
    return filtered
  }
  
  const exportHook = useExport({
    eventId,
    eventName: event.name,
    positions: getFilteredPositionsWithOverseer(),
    overseerFilter: selectedOverseer
  })
  
  // Destructure hook values for easier access
  const { 
    positions,
    selectedPosition, 
    setSelectedPosition,
    editingPosition,
    setEditingPosition,
    showInactive, 
    setShowInactive,
    selectedPositions,
    setSelectedPositions,
    isSubmitting,
    setIsSubmitting,
    handleDelete,
    handleActivate,
    handleDeactivate,
    handleHardDelete,
    handleBulkDelete,
    togglePositionSelection,
    selectAllPositions,
    clearSelection,
    getFilteredPositions
  } = positionsHook
  
  const {
    showAssignAttendantModal,
    setShowAssignAttendantModal,
    selectedShift,
    setSelectedShift,
    handleCreateAssignment,
    handleRemoveAssignment,
    handleClearAllAssignments
  } = assignmentsHook

  const openAssignModal = (
    position: Position,
    shift: any | null = null,
    role: AssignmentRole = 'VOLUNTEER'
  ) => {
    setSelectedPosition(position)
    setSelectedShift(shift)
    setAssignModalRole(role)
    setShowAssignAttendantModal(true)
  }

  const closeAssignModal = () => {
    setShowAssignAttendantModal(false)
    setSelectedShift(null)
    setAssignModalRole('VOLUNTEER')
  }

  const eventDateKeys = enumerateEventDateKeys(event?.startDate, event?.endDate)
  const multiDayEvent = isMultiDayEvent(event?.startDate, event?.endDate)
  const undatedShiftCount = multiDayEvent
    ? positions.reduce(
        (count, p) => count + (p.shifts?.filter(s => !toDateKey(s.shiftDate)).length || 0),
        0
      )
    : 0

  const {
    showBulkEditModal,
    setShowBulkEditModal,
    showTemplateModal,
    setShowTemplateModal,
    handleBulkEdit,
    handleApplyTemplate,
    handleBulkShiftCreate,
    handleBulkOversight,
    handleClearAllShifts
  } = bulkOpsHook
  
  const {
    showShiftModal,
    setShowShiftModal,
    shiftFormData,
    setShiftFormData,
    handleShiftSubmit: handleShiftSubmitHook,
    handleDeleteShift
  } = shiftsHook
  
  const {
    showOverseerModal,
    setShowOverseerModal,
    overseerFormData,
    setOverseerFormData,
    handleOverseerSubmit: handleOverseerSubmitHook
  } = oversightHook
  
  const {
    isExporting,
    handleExportPDF,
    handleExportExcel
  } = exportHook

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
      notifyAlert('Position name is required')
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
        notifyAlert(editingPosition ? 'Position updated successfully' : 'Position created successfully')
        setShowCreateModal(false)
        setEditingPosition(null)
        setFormData({ positionNumber: 1, name: '', area: '', description: '' })
        router.reload() // Refresh data without page reload
      } else {
        const error = await response.json()
        notifyAlert(error.error || 'Failed to save position')
      }
    } catch (error) {
      console.error('Error saving position:', error)
      notifyAlert('Failed to save position')
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

  // handleDelete is now provided by usePositions hook

  const closeModal = () => {
    setShowCreateModal(false)
    setEditingPosition(null)
    setFormData({ positionNumber: 1, name: '', area: '', description: '' })
  }

  // handleShiftSubmit is now provided by useShifts hook
  const handleShiftSubmit = (e: React.FormEvent) => handleShiftSubmitHook(e, selectedPosition)

  // handleOverseerSubmit is now provided by useOversight hook
  const handleOverseerSubmit = (e: React.FormEvent) => handleOverseerSubmitHook(e, selectedPosition)

  const handleBulkCreateSuccess = async (result: any) => {
    notifyAlert(`Successfully created ${result.created} positions`)
    setShowBulkCreator(false)
    router.reload() // Refresh page to show updated data
  }

  // APEX GUARDIAN: New Separated Bulk Operation Handlers
  
  // Handle bulk position updates (area, status)
  const handleBulkPositionUpdate = async () => {
    try {
      const area = (document.getElementById('bulk-area') as HTMLInputElement)?.value
      const isActive = (document.getElementById('bulk-status') as HTMLSelectElement)?.value
      
      if (!area && isActive === '') {
        notifyAlert('Please specify at least one field to update')
        return
      }
      
      let successCount = 0
      for (const positionId of selectedPositions) {
        const updateData: any = {}
        if (area) updateData.area = area
        if (isActive !== '') updateData.isActive = isActive === 'true'
        
        const success = await positionService.updatePosition(positionId, updateData)
        
        if (success) {
          successCount++
        } else {
          console.error(`Failed to update position ${positionId}`)
        }
      }
      
      notifyAlert(`✅ Successfully updated ${successCount} of ${selectedPositions.size} positions`)
      router.reload()
    } catch (error) {
      console.error('Bulk position update error:', error)
      notifyAlert('Failed to update positions')
    }
  }

  // Handle bulk template application
  const handleBulkTemplateApplication = async () => {
    try {
      const templateType = (document.getElementById('bulk-template') as HTMLSelectElement)?.value
      const volunteersNeeded = clampVolunteersNeeded(
        (document.getElementById('bulk-template-needed') as HTMLInputElement)?.value
      )
      
      if (!templateType) {
        notifyAlert('Please select a template')
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
          notifyAlert(
            '❌ Cannot apply All Day template to some positions\n\n' +
            `The following positions have partial shifts that conflict with All Day shifts:\n${positionNames}\n\n` +
            'Please delete existing partial shifts from these positions first, then apply the All Day template.'
          )
          return
        }
      }
      
      const success = await positionService.applyShiftTemplate({
        positionIds: Array.from(selectedPositions),
        templateType: templateType,
        volunteersNeeded
      })
      
      if (success) {
        notifyAlert(`✅ Template Applied Successfully!`)
        router.reload()
      } else {
        notifyAlert('Failed to apply template')
      }
    } catch (error) {
      console.error('Template application error:', error)
      notifyAlert('Failed to apply template')
    }
  }

  // Handle bulk custom shift creation
  const handleBulkCustomShiftCreation = async () => {
    try {
      const shiftName = (document.getElementById('bulk-shift-name') as HTMLInputElement)?.value
      const shiftStart = (document.getElementById('bulk-shift-start') as HTMLInputElement)?.value
      const shiftEnd = (document.getElementById('bulk-shift-end') as HTMLInputElement)?.value
      const isAllDay = (document.getElementById('bulk-shift-allday') as HTMLInputElement)?.checked
      const volunteersNeeded = clampVolunteersNeeded(
        (document.getElementById('bulk-shift-needed') as HTMLInputElement)?.value
      )
      const shiftDate =
        (document.getElementById('bulk-shift-date') as HTMLSelectElement)?.value || null
      
      if (!isAllDay && (!shiftStart || !shiftEnd)) {
        notifyAlert('Please specify start and end times, or check "All Day"')
        return
      }
      
      if (!shiftName) {
        notifyAlert('Please specify a shift name')
        return
      }

      if (multiDayEvent && !shiftDate) {
        notifyAlert('Please select a day for this shift (multi-day event)')
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
          notifyAlert(
            '❌ Cannot add All Day shift to some positions\n\n' +
            `The following positions have partial shifts that conflict with All Day shifts:\n${positionNames}\n\n` +
            'Please delete existing partial shifts from these positions first, then add the All Day shift.'
          )
          return
        }
      }
      
      let successCount = 0
      for (const positionId of selectedPositions) {
        const success = await positionService.createShift(positionId, {
          name: shiftName,
          startTime: isAllDay ? null : (shiftStart || ''),
          endTime: isAllDay ? null : (shiftEnd || ''),
          isAllDay: isAllDay,
          volunteersNeeded,
          shiftDate
        })
        
        if (success) {
          successCount++
        } else {
          console.error(`Failed to create shift for position ${positionId}`)
        }
      }
      
      notifyAlert(`✅ Successfully created "${shiftName}" shift (${volunteersNeeded} needed) for ${successCount} of ${selectedPositions.size} positions`)
      router.reload()
    } catch (error) {
      console.error('Custom shift creation error:', error)
      notifyAlert('Failed to create shifts')
    }
  }

  // Bulk update volunteersNeeded on existing shifts across selected positions
  const handleBulkUpdateVolunteersNeeded = async () => {
    try {
      const volunteersNeeded = clampVolunteersNeeded(
        (document.getElementById('bulk-update-needed') as HTMLInputElement)?.value
      )
      const nameFilter = (
        (document.getElementById('bulk-update-shift-name') as HTMLInputElement)?.value || ''
      ).trim().toLowerCase()

      const selectedPositionObjects = positions.filter(p => selectedPositions.has(p.id))
      let updatedCount = 0
      let skippedCount = 0

      setIsSubmitting(true)
      for (const position of selectedPositionObjects) {
        const shifts = position.shifts || []
        for (const shift of shifts) {
          if (nameFilter && !(shift.name || '').toLowerCase().includes(nameFilter)) {
            skippedCount++
            continue
          }
          const success = await positionService.updateShift(position.id, shift.id, {
            volunteersNeeded
          })
          if (success) {
            updatedCount++
          } else {
            skippedCount++
          }
        }
      }

      if (updatedCount === 0) {
        notifyAlert(
          nameFilter
            ? `No shifts matching "${nameFilter}" found on selected positions`
            : 'No shifts found on selected positions'
        )
        return
      }

      notifyAlert(
        `✅ Updated volunteers needed to ${volunteersNeeded} on ${updatedCount} shift${updatedCount === 1 ? '' : 's'}` +
          (skippedCount > 0 ? ` (${skippedCount} skipped)` : '')
      )
      router.reload()
    } catch (error) {
      console.error('Bulk update volunteers needed error:', error)
      notifyAlert('Failed to update volunteers needed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle combined shift creation + oversight assignment (FB-012)
  const handleCombinedShiftAndOversight = async () => {
    try {
      const shiftName = (document.getElementById('combined-shift-name') as HTMLInputElement)?.value
      const shiftStart = (document.getElementById('combined-shift-start') as HTMLInputElement)?.value
      const shiftEnd = (document.getElementById('combined-shift-end') as HTMLInputElement)?.value
      const isAllDay = (document.getElementById('combined-shift-allday') as HTMLInputElement)?.checked
      const volunteersNeeded = clampVolunteersNeeded(
        (document.getElementById('combined-shift-needed') as HTMLInputElement)?.value
      )
      const overseerId = (document.getElementById('combined-overseer') as HTMLSelectElement)?.value
      const keymanId = (document.getElementById('combined-keyman') as HTMLSelectElement)?.value
      
      if (!shiftName) {
        notifyAlert('Please specify a shift name')
        return
      }
      
      if (!isAllDay && (!shiftStart || !shiftEnd)) {
        notifyAlert('Please specify start and end times, or check "All Day"')
        return
      }
      
      setIsSubmitting(true)
      
      // Step 1: Create shifts for all selected positions
      let shiftSuccessCount = 0
      for (const positionId of selectedPositions) {
        const success = await positionService.createShift(positionId, {
          name: shiftName,
          startTime: isAllDay ? null : (shiftStart || ''),
          endTime: isAllDay ? null : (shiftEnd || ''),
          isAllDay: isAllDay,
          volunteersNeeded
        })
        
        if (success) {
          shiftSuccessCount++
        }
      }
      
      // Step 2: Assign oversight if specified
      let oversightSuccessCount = 0
      if (overseerId || keymanId) {
        const response = await fetch(`/api/events/${eventId}/positions/bulk-oversight`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionIds: Array.from(selectedPositions),
            overseerId: overseerId || null,
            keymanId: keymanId || null
          })
        })
        
        if (response.ok) {
          oversightSuccessCount = selectedPositions.size
        }
      }
      
      // Report results
      const messages: string[] = []
      if (shiftSuccessCount > 0) {
        messages.push(`✅ Created "${shiftName}" shift for ${shiftSuccessCount} positions`)
      }
      if (oversightSuccessCount > 0) {
        messages.push(`✅ Assigned oversight to ${oversightSuccessCount} positions`)
      }
      
      if (messages.length > 0) {
        notifyAlert(messages.join('\n'))
        // Keep modal open and selection preserved (FB-012 requirement)
        router.reload()
      } else {
        notifyAlert('No changes were made')
      }
    } catch (error) {
      console.error('Combined operation error:', error)
      notifyAlert('Failed to complete combined operation')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle bulk oversight assignment using new API
  const handleBulkOversightAssignment = async () => {
    try {
      const overseerId = (document.getElementById('bulk-overseer') as HTMLSelectElement)?.value
      const keymanId = (document.getElementById('bulk-keyman') as HTMLSelectElement)?.value
      
      if (!overseerId && !keymanId) {
        notifyAlert('Please select at least one oversight role to assign')
        return
      }
      
      const success = await positionService.bulkAssignOversight({
        positionIds: Array.from(selectedPositions),
        overseerId: overseerId || undefined,
        keymanId: keymanId || undefined
      })
      
      if (success) {
        notifyAlert(`✅ Oversight Assigned Successfully!`)
        router.reload()
      } else {
        notifyAlert('Failed to assign oversight')
      }
    } catch (error) {
      console.error('Bulk oversight assignment error:', error)
      notifyAlert('Failed to assign oversight')
    }
  }

  // handleDeleteShift is now provided by useShifts hook

  // handleBulkDelete is now provided by usePositions hook

  // handleRemoveAssignment is now provided by useAssignments hook

  // Export handlers are now provided by useExport hook

  // Auto-assign algorithm - APEX GUARDIAN OVERSIGHT-AWARE VERSION v3.0
  // Refactored to use extracted AutoAssignmentEngine (Week 1, Step 2)
  const handleAutoAssignOversightAware = async () => {
    if (!(await appConfirmMessage('Auto-assign available volunteers to unfilled positions?'))) return
    
    try {
      setIsSubmitting(true)
      setShowProgressModal(true)

      // Initialize the AutoAssignmentEngine with current data
      const engine = new AutoAssignmentEngine({
        eventId,
        positions,
        attendants,
        onProgress: (progress) => {
          // Convert progress format to match component state
          setAssignmentProgress({
            phase: progress.phase,
            current: progress.current,
            total: progress.total,
            message: progress.message,
            assignments: [] // Component expects object array, engine provides string array
          })
        },
        onLog: (message) => {
          console.log(message)
          // Store logs in localStorage for debugging
          const logs = JSON.parse(localStorage.getItem('autoAssignLogs') || '[]')
          logs.push(message)
          localStorage.setItem('autoAssignLogs', JSON.stringify(logs))
        }
      })

      // Execute the auto-assignment algorithm
      const result = await engine.execute()

      // Show success message with results
      notifyAlert(result.message)

      // Show completion status
      setAssignmentProgress({
        phase: 'Assignment Complete!',
        current: result.totalAssignments,
        total: result.totalAssignments,
        message: `Successfully assigned ${result.totalAssignments} shifts!`,
        assignments: []
      })

      // Reload page after brief delay
      setTimeout(() => {
        setShowProgressModal(false)
        router.reload()
      }, 2000)
      
      return // Don't close modal immediately
    } catch (error) {
      console.error('Auto-assign error:', error)
      notifyAlert('Failed to auto-assign volunteers')
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

  // getFilteredPositionsWithOverseer is now defined earlier in the component

  // Get unassigned attendants count (excluding leadership roles)
  const getUnassignedCount = () => {
    const assignedAttendantIds = new Set()
    const leadershipAttendantIds = new Set()
    
    positions.forEach(position => {
      // Track assigned attendants
      position.assignments?.forEach(assignment => {
        if (assignment.volunteer?.id) {
          assignedAttendantIds.add(assignment.volunteer.id)
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
        if (assignment.volunteer?.id) {
          assignedAttendantIds.add(assignment.volunteer.id)
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
    <EventPageWrapper
      event={event}
      currentPage="positions"
      canEdit={canEdit}
      canDelete={canDelete}
      canManagePermissions={canManagePermissions}
      moduleConfig={moduleConfig}
      terminology={terminology}
    >
      <Head>
        <title>{event?.name ? `${event.name} - Positions` : 'Event Positions'} | Theocratic Shift Scheduler</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {multiDayEvent && undatedShiftCount > 0 && canManageContent && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This is a multi-day event. {undatedShiftCount} shift{undatedShiftCount === 1 ? '' : 's'} still have no day set,
              so same clock times on different days may show as conflicts. Edit each shift and choose
              Fri / Sat / Sun (or the event day) — naming the shift is not enough.
            </div>
          )}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <span>
              You are on the classic Positions layout. The day board is now the default.
            </span>
            <Link
              href={`/events/${eventId}/positions-next`}
              className="inline-flex min-h-[44px] items-center rounded-md border border-amber-300 bg-white px-3 py-2 font-medium text-amber-900 hover:bg-amber-100 touch-manipulation"
            >
              Use day board
            </Link>
          </div>
          <div className="mb-8">
            {/* Professional Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Primary Actions */}
                {canManageContent && (
                  <>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors min-h-[44px] touch-manipulation"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create
                    </button>
                    <button
                      onClick={() => setShowBulkCreator(true)}
                      className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors min-h-[44px] touch-manipulation"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Bulk Create
                    </button>
                  </>
                )}
                
                {/* Auto-Assign - Always visible for admins */}
                {canManageContent && (
                  <button
                    onClick={handleAutoAssignOversightAware}
                    disabled={isSubmitting || getUnassignedCount() === 0}
                    className="inline-flex items-center px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors min-h-[44px] touch-manipulation"
                    title={getUnassignedCount() === 0 ? "No unassigned volunteers available" : `Auto-assign ${getUnassignedCount()} unassigned volunteers`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                        <span>Assigning...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Auto-Assign ({getUnassignedCount()})
                      </>
                    )}
                  </button>
                )}
                
                {/* View Toggle */}
                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm font-medium transition-colors min-h-[44px] touch-manipulation ${
                      viewMode === 'list'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="List View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    disabled={isSmallScreen}
                    className={`px-3 py-2 text-sm font-medium border-l border-gray-300 transition-colors min-h-[44px] touch-manipulation ${
                      viewMode === 'grid'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    } ${isSmallScreen ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isSmallScreen ? 'Grid view is available on desktop' : 'Grid View'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
                
                {/* Filters Dropdown */}
                <div className="relative inline-block">
                  <button
                    onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showFiltersMenu && (
                    <div className="absolute left-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <div className="p-3 space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Overseer</label>
                          <select
                            value={selectedOverseer}
                            onChange={(e) => setSelectedOverseer(e.target.value)}
                            className="w-full px-3 py-2 min-h-[44px] text-base sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">All Overseers</option>
                            {Array.from(new Set(
                              positions
                                .map(p => p.oversight?.[0]?.overseer)
                                .filter(Boolean)
                                .map(o => JSON.stringify({ id: o!.id, name: `${o!.firstName} ${o!.lastName}` }))
                            )).map(overseerStr => {
                              const overseer = JSON.parse(overseerStr)
                              return (
                                <option key={overseer.id} value={overseer.id}>
                                  {overseer.name}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                          <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'overseers' | 'assistants' | 'keymen')}
                            className="w-full px-3 py-2 min-h-[44px] text-base sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="all">All Roles</option>
                            <option value="overseers">Overseers</option>
                            <option value="assistants">Assistants</option>
                            <option value="keymen">Keymen</option>
                          </select>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <button
                            onClick={() => {
                              const newState = !showInactive
                              setShowInactive(newState)
                              localStorage.setItem(`showInactive-event-${eventId}`, newState.toString())
                              const url = new URL(window.location.href)
                              if (newState) {
                                url.searchParams.set('showInactive', 'true')
                              } else {
                                url.searchParams.delete('showInactive')
                              }
                              window.history.replaceState({}, '', url.toString())
                            }}
                            className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={showInactive}
                              onChange={() => {}}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span>Show Inactive</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* More Menu */}
                <div className="relative inline-block">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                    More
                  </button>
                  {showActionsMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => { handleExportPDF(); setShowActionsMenu(false); }}
                        disabled={isExporting}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
                      </button>
                      <button
                        onClick={() => { handleExportExcel(); setShowActionsMenu(false); }}
                        disabled={isExporting}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
                      </button>
                      {canManageContent && (
                        <>
                          <button
                            onClick={async () => {
                              setShowActionsMenu(false)
                              if (assignmentNotifySending || bulkEmailJobKind) {
                                notifyAlert('An assignment notification send is already in progress.')
                                return
                              }
                              try {
                                const previewRes = await fetch(
                                  `/api/events/${eventId}/assignments/send-notifications`,
                                  { credentials: 'include' }
                                )
                                const preview = await previewRes.json().catch(() => ({}))
                                const count =
                                  typeof preview.recipientCount === 'number'
                                    ? preview.recipientCount
                                    : 0
                                if (!previewRes.ok) {
                                  notifyAlert(preview.error || preview.message || 'Could not preview recipients')
                                  return
                                }
                                if (count === 0) {
                                  notifyAlert('No assigned volunteers with an email address to notify.')
                                  return
                                }
                                const confirmed = await appConfirm({
                                  title: 'Send assignment notifications',
                                  message: formatBulkEmailConfirmMessage({
                                    recipientCount: count,
                                    estimatedSeconds:
                                      typeof preview.estimatedSeconds === 'number'
                                        ? preview.estimatedSeconds
                                        : Math.ceil(count * 1.2),
                                    scopeNote:
                                      'Assigned volunteers with email only (one email per person).',
                                  }),
                                  confirmLabel: 'Queue emails',
                                  cancelLabel: 'Cancel',
                                })
                                if (!confirmed) return

                                setAssignmentNotifySending(true)
                                setBulkEmailJobKind('assignment-notifications')
                                const response = await fetch(
                                  `/api/events/${eventId}/assignments/send-notifications`,
                                  {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                  }
                                )
                                const data = await response.json().catch(() => ({}))
                                if (response.ok && data.success) {
                                  notifyAlert(data.message || `Queued ${count} notification(s)`)
                                  if (!data.async) {
                                    setBulkEmailJobKind(null)
                                  }
                                } else {
                                  setBulkEmailJobKind(null)
                                  notifyAlert(
                                    data.error || data.message || 'Failed to send notifications'
                                  )
                                }
                              } catch (error: unknown) {
                                setBulkEmailJobKind(null)
                                notifyAlert(
                                  `Failed to send notifications: ${
                                    error instanceof Error ? error.message : String(error)
                                  }`
                                )
                              } finally {
                                setAssignmentNotifySending(false)
                              }
                            }}
                            disabled={assignmentNotifySending}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-h-[44px]"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>
                              {assignmentNotifySending ? 'Queuing...' : 'Send Notifications'}
                            </span>
                          </button>
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            onClick={async () => {
                              setShowActionsMenu(false)
                              if (!(await appConfirmMessage('⚠️ Clear ALL shifts from ALL positions?\n\nThis will remove all shifts AND their assignments.\n\nThis action cannot be undone.'))) return
                              try {
                                const success = await positionService.clearAllShifts()
                                if (success) {
                                  notifyAlert('✅ Cleared all shifts and assignments')
                                  router.reload()
                                } else {
                                  notifyAlert('Failed to clear shifts')
                                }
                              } catch (error) {
                                console.error('Clear shifts error:', error)
                                notifyAlert('Failed to clear shifts')
                              }
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Clear All Shifts</span>
                          </button>
                          <button
                            onClick={async () => {
                              setShowActionsMenu(false)
                              if (!(await appConfirmMessage('⚠️ Clear ALL assignments?\n\nThis cannot be undone.'))) return
                              try {
                                const success = await positionService.clearAllAssignments()
                                if (success) {
                                  notifyAlert('✅ Cleared all assignments')
                                  router.reload()
                                } else {
                                  notifyAlert('Failed to clear assignments')
                                }
                              } catch (error) {
                                notifyAlert('Failed to clear assignments')
                              }
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Clear All Assignments</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {canManageContent && bulkEmailJobKind && (
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await abortEventBulkEmail(eventId, bulkEmailJobKind)
                      notifyAlert(result.message)
                      if (result.ok) setBulkEmailJobKind(null)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors min-h-[44px] touch-manipulation"
                  >
                    Abort notification send
                  </button>
                )}
              </div>

              {/* Bulk Operations Bar (contextual) */}
              {canManageContent && selectedPositions.size > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-blue-700 font-medium">
                    {selectedPositions.size} selected
                  </span>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="text-xs bg-white hover:bg-gray-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-300"
                  >
                    Template
                  </button>
                  <button
                    onClick={() => setShowBulkEditModal(true)}
                    className="text-xs bg-white hover:bg-gray-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="text-xs bg-white hover:bg-gray-50 text-red-600 px-2 py-1 rounded font-medium border border-red-300"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedPositions(new Set())}
                    className="text-xs bg-white hover:bg-gray-50 text-gray-700 px-2 py-1 rounded font-medium border border-gray-300"
                  >
                    Clear
                  </button>
                </div>
              )}
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
              const activePositions = positions.filter(p => p.isActive)
              const { filled, needed, percentage: completionPercentage } = activePositions.reduce(
                (acc, pos) => {
                  const r = getPositionSlotFillRatio(pos.shifts, pos.assignments)
                  return {
                    filled: acc.filled + r.filled,
                    needed: acc.needed + r.needed,
                    percentage: 0
                  }
                },
                { filled: 0, needed: 0, percentage: 0 }
              )
              const pct = needed > 0 ? Math.round((filled / needed) * 100) : 0
              
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Shift Coverage</p>
                      <p className="text-3xl font-bold text-gray-900">{filled}/{needed}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        pct === 100 ? 'bg-green-500' : 
                        pct >= 80 ? 'bg-blue-500' : 
                        pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{pct}% Complete</p>
                </div>
              )
            })()}
            
            <div
              onClick={() => setShowAvailableAttendants(true)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer hover:border-purple-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Available Volunteers</p>
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
                    {positions.filter(p => p.isActive).reduce((sum, p) => sum + (p.assignments?.filter(a => a.role === 'VOLUNTEER').length || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional View: Grid or List */}
          {viewMode === 'grid' ? (
            positions.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
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
            ) : getFilteredPositions().length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <span className="text-6xl mb-4 block">👁️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions visible</h3>
                <p className="text-gray-500 mb-4">
                  All positions may be inactive. Turn on Show Inactive in Filters to see them.
                </p>
              </div>
            ) : getFilteredPositionsWithOverseer().length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <span className="text-6xl mb-4 block">🔍</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions match filters</h3>
                <p className="text-gray-500 mb-4">
                  Try clearing Overseer / Role filters or adjusting Show Inactive.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOverseer('all')
                    setRoleFilter('all')
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <PositionGridView
                positions={getFilteredPositionsWithOverseer()}
                attendants={attendants}
                eventId={eventId}
                onAssign={async (positionId, shiftId, attendantId) => {
                  try {
                    const success = await positionService.createAssignment({
                      positionId,
                      attendantId,
                      shiftId
                    })
                    if (success) {
                      router.reload()
                    } else {
                      notifyAlert('Failed to create assignment')
                    }
                  } catch (error) {
                    console.error('Assignment error:', error)
                    notifyAlert('Failed to create assignment')
                  }
                }}
                onUnassign={async (assignmentId) => {
                  try {
                    const success = await positionService.deleteAssignment(assignmentId)
                    if (success) {
                      router.reload()
                    } else {
                      notifyAlert('Failed to remove assignment')
                    }
                  } catch (error) {
                    console.error('Error removing assignment:', error)
                    notifyAlert('Failed to remove assignment')
                  }
                }}
              />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {positions.length === 0 ? (
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
            ) : getFilteredPositions().length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
                <span className="text-6xl mb-4 block">👁️</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions visible</h3>
                <p className="text-gray-500 mb-4">
                  All positions may be inactive. Turn on Show Inactive in Filters to see them.
                </p>
              </div>
            ) : getFilteredPositionsWithOverseer().length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
                <span className="text-6xl mb-4 block">🔍</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions match filters</h3>
                <p className="text-gray-500 mb-4">
                  Try clearing Overseer / Role filters or adjusting Show Inactive.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOverseer('all')
                    setRoleFilter('all')
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              getFilteredPositionsWithOverseer().map((position) => {
                // Slot-based completion (respects volunteersNeeded, default 1)
                const { filled: assignedShifts, needed: totalShifts, percentage: completionPercentage } =
                  getPositionSlotFillRatio(position.shifts, position.assignments)
                
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
                        <span>{assignedShifts}/{totalShifts} slots filled</span>
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
                      <span>{position.shifts?.length || 0} shifts • {position.assignments?.filter(a => a.role === 'VOLUNTEER').length || 0} attendants</span>
                    </div>


                    {/* SHIFT-SPECIFIC ASSIGNMENT DISPLAY */}
                    {position.shifts && position.shifts.length > 0 ? (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">🕐 Shift Assignments</p>
                        <div className="space-y-2">
                          {sortShiftsByTime(position.shifts).map(shift => {
                            // Find assignments for this specific shift
                            const shiftSpecificAssignments = position.assignments?.filter(assignment => 
                              assignment.shift?.id === shift.id
                            ) || []
                            
                            const filledCount = countShiftAssignments(position.assignments, shift.id)
                            const neededCount = getShiftVolunteersNeeded(shift)
                            
                            // Separate regular attendants from leadership for this shift
                            const attendantAssignments = shiftSpecificAssignments.filter(assignment => 
                              assignment.role === 'VOLUNTEER' || assignment.role === 'ATTENDANT'
                            )
                            const shiftLeadershipAssignments = shiftSpecificAssignments.filter(assignment => 
                              assignment.role === 'OVERSEER' || assignment.role === 'KEYMAN'
                            )
                            const shiftOverseerName = shiftLeadershipAssignments.find(a => a.role === 'OVERSEER')
                            const shiftKeymanAssign = shiftLeadershipAssignments.find(a => a.role === 'KEYMAN')
                            const positionOversight = position.oversight?.[0]
                            const isEditing = editingShiftId === shift.id
                            
                            return (
                              <div key={shift.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
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
                                    {toDateKey(shift.shiftDate) && (
                                      <span className="text-xs text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                                        {formatEventDayLabel(toDateKey(shift.shiftDate)!)}
                                      </span>
                                    )}
                                    {multiDayEvent && !toDateKey(shift.shiftDate) && (
                                      <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded" title="Set a day so Friday/Saturday shifts do not conflict">
                                        No day
                                      </span>
                                    )}
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      filledCount >= neededCount
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {filledCount}/{neededCount}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {canManageContent && !isEditing && (
                                      <button
                                        type="button"
                                        onClick={() => setEditingShiftId(shift.id)}
                                        className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded px-3 py-2 min-h-[44px] min-w-[44px] touch-manipulation transition-colors"
                                        title={`Edit ${shift.name} shift`}
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {canManageContent && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteShift(position.id, shift.id, shift.name || 'Shift')}
                                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-100 rounded px-3 py-2 min-h-[44px] min-w-[44px] touch-manipulation transition-colors"
                                        title={`Delete ${shift.name || 'Shift'} shift`}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {isEditing && (
                                  <ShiftInlineEditor
                                    initial={{
                                      name: shift.name || '',
                                      startTime: shift.startTime || '',
                                      endTime: shift.endTime || '',
                                      isAllDay: !!shift.isAllDay,
                                      volunteersNeeded: neededCount,
                                      shiftDate: toDateKey(shift.shiftDate)
                                    }}
                                    eventDateKeys={eventDateKeys}
                                    saving={savingShiftId === shift.id}
                                    onCancel={() => setEditingShiftId(null)}
                                    onSave={async (values) => {
                                      if (filledCount > 0) {
                                        const confirmed = await appConfirm({
                                          title: 'Update shift times',
                                          message: `This updates times for ${filledCount} assigned volunteer${
                                            filledCount === 1 ? '' : 's'
                                          } on this shift. Continue?`,
                                          confirmLabel: 'Update times',
                                          cancelLabel: 'Cancel',
                                        })
                                        if (!confirmed) return
                                      }
                                      setSavingShiftId(shift.id)
                                      try {
                                        const ok = await positionService.updateShift(position.id, shift.id, {
                                          name: values.name,
                                          startTime: values.isAllDay ? null : values.startTime || null,
                                          endTime: values.isAllDay ? null : values.endTime || null,
                                          isAllDay: values.isAllDay,
                                          volunteersNeeded: values.volunteersNeeded,
                                          shiftDate: values.shiftDate
                                        })
                                        if (ok) {
                                          setEditingShiftId(null)
                                          router.reload()
                                        } else {
                                          notifyAlert('Failed to update shift')
                                        }
                                      } catch (err) {
                                        console.error(err)
                                        notifyAlert('Failed to update shift')
                                      } finally {
                                        setSavingShiftId(null)
                                      }
                                    }}
                                  />
                                )}

                                {/* Prefer shift overseer; fall back to position oversight label */}
                                {!isEditing && (shiftOverseerName ? (
                                  <p className="text-xs text-blue-700 mb-1">
                                    Shift overseer: {(shiftOverseerName as any).volunteer?.firstName || (shiftOverseerName as any).attendant?.firstName}{' '}
                                    {(shiftOverseerName as any).volunteer?.lastName || (shiftOverseerName as any).attendant?.lastName}
                                  </p>
                                ) : positionOversight?.overseer ? (
                                  <p className="text-xs text-gray-500 mb-1">
                                    Position overseer: {positionOversight.overseer.firstName} {positionOversight.overseer.lastName}
                                  </p>
                                ) : null)}
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
                                                {assignment.volunteer?.firstName} {assignment.volunteer?.lastName}
                                              </span>
                                              <span className="ml-2 text-xs text-gray-500">
                                                ({assignment.role === 'OVERSEER' ? 'Overseer' : 'Keyman'})
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
                                      const roleColor = 'text-green-700'
                                      const bgColor = 'bg-green-50 border-green-100'
                                      // Check if this volunteer has a conflict with any OTHER shift on this event
                                      const volunteerId = assignment.volunteer?.id
                                      const assignmentMapForRow = buildVolunteerAssignmentMap(positions)
                                      const volunteerShifts = volunteerId ? (assignmentMapForRow.get(volunteerId) || []) : []
                                      const hasRowConflict = volunteerShifts.length > 1 && (() => {
                                        for (let i = 0; i < volunteerShifts.length; i++) {
                                          for (let j = i + 1; j < volunteerShifts.length; j++) {
                                            if (shiftsConflict(volunteerShifts[i].shift, volunteerShifts[j].shift)) {
                                              return true
                                            }
                                          }
                                        }
                                        return false
                                      })()
                                      
                                      return (
                                        <div key={assignment.id} className={`flex items-center justify-between ${hasRowConflict ? 'bg-amber-50 border-amber-200' : bgColor} border rounded px-2 py-1`}>
                                          <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-medium ${hasRowConflict ? 'text-amber-800' : roleColor}`}>
                                              {assignment.volunteer?.firstName} {assignment.volunteer?.lastName}
                                            </span>
                                            {hasRowConflict && (
                                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700" title="This volunteer has overlapping shift assignments">
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                                </svg>
                                                Conflict
                                              </span>
                                            )}
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
                                    {/* Add another volunteer button */}
                                    <button
                                      onClick={() => openAssignModal(position, shift, 'VOLUNTEER')}
                                      className="w-full text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 border-dashed rounded px-2 py-1 transition-colors"
                                    >
                                      + Assign Another Volunteer
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openAssignModal(position, shift, 'VOLUNTEER')}
                                    className="w-full text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-1 transition-colors"
                                  >
                                    + Assign Volunteer
                                  </button>
                                )}
                                {canManageContent && (
                                  <div className="mt-1 space-y-1">
                                    {!shiftOverseerName && (
                                      <button
                                        type="button"
                                        onClick={() => openAssignModal(position, shift, 'OVERSEER')}
                                        className="w-full text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded px-2 py-1 transition-colors"
                                      >
                                        + Assign Overseer
                                      </button>
                                    )}
                                    {!shiftKeymanAssign && (
                                      <button
                                        type="button"
                                        onClick={() => openAssignModal(position, shift, 'KEYMAN')}
                                        className="w-full text-xs text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded px-2 py-1 transition-colors"
                                      >
                                        + Assign Keyman
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* Add Shift — always allowed when days differ from existing All Day */}
                        <button
                          onClick={() => {
                            setSelectedPosition(position)
                            setShowShiftModal(true)
                          }}
                          className="w-full mt-2 text-xs text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 rounded px-2 py-1 transition-colors"
                        >
                          + Add Shift
                        </button>
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
                            onClick={() => openAssignModal(position, null, 'VOLUNTEER')}
                            className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-1 transition-colors"
                          >
                            + Assign Volunteer
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
                          👥 Position Oversight
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
                            if (!(await appConfirmMessage(`Mark "${position.name}" as inactive? This will hide it from active view but preserve all data.`))) {
                              return
                            }
                            try {
                              const success = await positionService.deactivatePosition(position.id)
                              if (success) {
                                router.reload()
                              } else {
                                notifyAlert('Failed to deactivate position')
                              }
                            } catch (error) {
                              notifyAlert('Failed to deactivate position')
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
                              const success = await positionService.activatePosition(position.id)
                              if (success) {
                                router.reload()
                              } else {
                                notifyAlert('Failed to activate position')
                              }
                            } catch (error) {
                              notifyAlert('Failed to activate position')
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
                                notifyAlert('Failed to activate position')
                              }
                            } catch (error) {
                              notifyAlert('Failed to activate position')
                            }
                          }}
                          className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          ✅ Activate
                        </button>
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              const confirmed = await appConfirmMessage(
                                `⚠️ PERMANENT DELETION ⚠️\n\n` +
                                `This will permanently delete "${position.name}" from the database.\n` +
                                `This action CANNOT be undone.\n\n` +
                                `Are you absolutely sure?`
                              )
                              if (!confirmed) return

                              try {
                                const result = await positionService.hardDeletePosition(position.id)
                                
                                if (result.success) {
                                  notifyAlert(`Position "${position.name}" permanently deleted.`)
                                  router.reload()
                                } else {
                                  if (result.error) {
                                    notifyAlert(
                                      `Cannot delete position:\n${result.error}`
                                    )
                                  } else {
                                    notifyAlert(`Failed: ${result.error}`)
                                  }
                                }
                              } catch (error) {
                                notifyAlert('Failed to permanently delete position')
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
          )}
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
        <CreatePositionModal
          isOpen={showCreateModal}
          editingPosition={editingPosition}
          formData={formData}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onFormDataChange={setFormData}
        />

        {/* Shift Creation Modal */}
        <ShiftModal
          isOpen={showShiftModal}
          position={selectedPosition}
          formData={shiftFormData}
          eventDateKeys={eventDateKeys}
          onClose={() => setShowShiftModal(false)}
          onSubmit={handleShiftSubmit}
          onFormDataChange={setShiftFormData}
        />

        {/* Overseer Assignment Modal */}
        <OverseerModal
          isOpen={showOverseerModal}
          position={selectedPosition}
          attendants={attendants}
          formData={overseerFormData}
          onClose={() => setShowOverseerModal(false)}
          onSubmit={handleOverseerSubmit}
          onFormDataChange={setOverseerFormData}
        />

        {/* Assign Volunteer / Overseer / Keyman Modal */}
        {showAssignAttendantModal && selectedPosition && (() => {
          // Prefer shift-level OVERSEER/KEYMAN for volunteer pool; fall back to position oversight
          const oversight = selectedPosition.oversight && selectedPosition.oversight.length > 0 ? selectedPosition.oversight[0] : null
          const shiftLeadership = selectedPosition.assignments?.filter(
            a => a.shift?.id === selectedShift?.id && (a.role === 'OVERSEER' || a.role === 'KEYMAN')
          ) || []
          const shiftOverseerAssign = shiftLeadership.find(a => a.role === 'OVERSEER')
          const shiftKeymanAssign = shiftLeadership.find(a => a.role === 'KEYMAN')
          const positionOverseer = (shiftOverseerAssign as any)?.volunteer || (shiftOverseerAssign as any)?.attendant || oversight?.overseer
          const positionKeyman = (shiftKeymanAssign as any)?.volunteer || (shiftKeymanAssign as any)?.attendant || oversight?.keyman
          let filteredAttendants = attendants?.filter(att => att.isActive) || []
          // Full roster for manual assign; modal sorts matching overseer/keyman first

          return (
            <AssignVolunteerModal
              key={`${selectedShift?.id || 'none'}-${assignModalRole}`}
              position={selectedPosition}
              selectedShift={selectedShift}
              filteredAttendants={filteredAttendants}
              allPositions={positions}
              eventId={eventId}
              eventDateKeys={eventDateKeys}
              initialRole={assignModalRole}
              preferredOverseerId={positionOverseer?.id || null}
              preferredKeymanId={positionKeyman?.id || null}
              onClose={closeAssignModal}
              onSuccess={() => { closeAssignModal(); router.reload() }}
              formatTime={formatTime12Hour}
            />
          )
        })()}

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
                      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                          <select 
                            id="bulk-template"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Choose a template...</option>
                            <option value="standard">Standard Day (7:50-10, 10-12, 12-2, 2-5)</option>
                            <option value="extended">Extended Day (6:30-8:30, 8:30-10:30, 10:30-12:45, 12:45-3, 3-Close)</option>
                            <option value="allday">All Day Shift</option>
                          </select>
                        </div>
                        <div className="w-full sm:w-36">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Volunteers needed</label>
                          <input
                            id="bulk-template-needed"
                            type="number"
                            min={1}
                            max={50}
                            defaultValue={1}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
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
                    <div className="mb-6 p-4 border border-orange-300 rounded-md bg-white">
                      <h5 className="font-medium text-gray-900 mb-3">Create Custom Shift</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Volunteers needed
                          </label>
                          <input
                            id="bulk-shift-needed"
                            type="number"
                            min={1}
                            max={50}
                            defaultValue={1}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        {multiDayEvent && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Day
                            </label>
                            <select
                              id="bulk-shift-date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              defaultValue=""
                            >
                              <option value="">Select a day…</option>
                              {eventDateKeys.map(key => (
                                <option key={key} value={key}>
                                  {formatEventDayLabel(key)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
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

                    {/* Update Existing Shifts Capacity */}
                    <div className="p-4 border border-orange-300 rounded-md bg-white">
                      <h5 className="font-medium text-gray-900 mb-1">Update Volunteers Needed</h5>
                      <p className="text-xs text-gray-500 mb-3">
                        Change capacity on existing shifts for the selected positions. Leave name blank to update all shifts.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Volunteers needed
                          </label>
                          <input
                            id="bulk-update-needed"
                            type="number"
                            min={1}
                            max={50}
                            defaultValue={1}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Match shift name (optional)
                          </label>
                          <input
                            id="bulk-update-shift-name"
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="e.g., Morning"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={handleBulkUpdateVolunteersNeeded}
                            disabled={isSubmitting}
                            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-md font-medium"
                          >
                            {isSubmitting ? 'Updating...' : `Update on ${selectedPositions.size} Positions`}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. COMBINED SHIFT + OVERSIGHT (FB-012) */}
                  <div className="border border-purple-200 rounded-lg p-6 bg-purple-50">
                    <h4 className="text-lg font-medium text-purple-900 mb-4 flex items-center">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">3</span>
                      Combined: Create Shift + Assign Oversight
                    </h4>
                    <p className="text-sm text-purple-700 mb-4">Create a shift AND assign oversight in one operation (FB-012)</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Shift Details */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-900">Shift Details</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                          <input
                            id="combined-shift-name"
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g., Morning"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                            <input
                              id="combined-shift-start"
                              type="time"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                            <input
                              id="combined-shift-end"
                              type="time"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="combined-shift-allday"
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <label htmlFor="combined-shift-allday" className="ml-2 text-sm text-gray-900">All Day</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Volunteers needed</label>
                          <input
                            id="combined-shift-needed"
                            type="number"
                            min={1}
                            max={50}
                            defaultValue={1}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      
                      {/* Oversight Assignment */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-gray-900">Oversight Assignment</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Overseer</label>
                          <select
                            id="combined-overseer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">No Overseer</option>
                            {attendants.filter(att => att.isActive && att.isOverseer).map(overseer => (
                              <option key={overseer.id} value={overseer.id}>
                                {overseer.firstName} {overseer.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Keyman</label>
                          <select
                            id="combined-keyman"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">No Keyman</option>
                            {attendants.filter(att => att.isActive && att.isKeyman).map(keyman => (
                              <option key={keyman.id} value={keyman.id}>
                                {keyman.firstName} {keyman.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleCombinedShiftAndOversight}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md font-medium"
                      >
                        {isSubmitting ? 'Processing...' : `Apply to ${selectedPositions.size} Positions`}
                      </button>
                    </div>
                  </div>

                  {/* 4. BULK OVERSIGHT ASSIGNMENT */}
                  <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                    <h4 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">4</span>
                      Bulk Oversight Assignment (Separate)
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
                          {attendants?.filter(att => att.isActive && att.isOverseer).map(attendant => (
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
                          {attendants?.filter(att => att.isActive && att.isKeyman).map(attendant => (
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
                    notifyAlert('Please select a template')
                    return
                  }
                  
                  try {
                    setIsSubmitting(true)
                    
                    const success = await positionService.applyShiftTemplate({
                      positionIds: Array.from(selectedPositions),
                      templateType: templateType
                    })
                    
                    if (success) {
                      setShowTemplateModal(false)
                      setSelectedPositions(new Set())
                      router.reload()
                    } else {
                      notifyAlert('Failed to apply template')
                    }
                  } catch (error) {
                    console.error('Error applying template:', error)
                    notifyAlert('Failed to apply template')
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
                          <span>{String(assignment)}</span>
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

        {/* Available Volunteers Modal */}
        {showAvailableAttendants && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto border w-full max-w-2xl shadow-2xl rounded-xl bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">Available Volunteers</h3>
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
    </EventPageWrapper>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const timestamp = new Date().toISOString()
  
  try {
    const session = await getServerSession(context.req, context.res, authOptions)
  
    if (!session) {
      return {
        redirect: {
          destination: '/auth/signin',
        },
      }
    }

    // CRITICAL: Block attendants from accessing admin pages
    if (session.user?.role === 'VOLUNTEER') {
      return {
        redirect: {
          destination: '/volunteer/dashboard',
          permanent: false,
        },
      }
    }

    // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN can access
    if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(session.user?.role || '')) {
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false,
        },
      }
    }

    const canManage = session.user?.role === 'ADMIN' || session.user?.role === 'OVERSEER'

    // Check event-specific permissions
    const { canManageEvent, canDeleteEvent, canManagePermissions } = await import('../../../src/lib/eventAccess')
    const sessionUserId = session.user?.id || ''
    const canEdit = await canManageEvent(sessionUserId, context.params!.id as string)
    const canDelete = await canDeleteEvent(sessionUserId, context.params!.id as string)
    const canManagePerms = await canManagePermissions(sessionUserId, context.params!.id as string)

    // APEX GUARDIAN: Full SSR data fetching for positions tab
    const { id } = context.params!
    
    const { prisma } = await import('../../../src/lib/prisma')
    
    // Fetch event with positions data
    const eventData = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        positions: {
          include: {
            assignments: {
              include: {
                volunteer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    user: { select: { role: true } }
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
                    isAllDay: true,
                    shiftDate: true
                  }
                }
              }
            },
            shifts: {
              orderBy: { sequence: 'asc' }
            }
          },
          orderBy: [
            { positionNumber: 'asc' }
          ]
        }
      }
    })

    // Fetch event settings separately (settings is a JSON column, not a relation)
    const eventSettings = await prisma.events.findUnique({
      where: { id: id as string },
      select: { settings: true }
    })

    // Fetch attendants for overseer assignment from attendants table
    // APEX GUARDIAN: Manually fetch oversight data since relation has TypeScript issues
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
        oversight: positionOversight,
        shifts: (position.shifts || []).map((shift: any) => ({
          ...shift,
          shiftDate: shift.shiftDate ? toDateKey(shift.shiftDate) : null,
          createdAt: shift.createdAt instanceof Date ? shift.createdAt.toISOString() : shift.createdAt
        })),
        assignments: (position.assignments || []).map((assignment: any) => ({
          ...assignment,
          assignedAt: assignment.assignedAt instanceof Date ? assignment.assignedAt.toISOString() : assignment.assignedAt,
          shift: assignment.shift
            ? {
                ...assignment.shift,
                shiftDate: assignment.shift.shiftDate
                  ? toDateKey(assignment.shift.shiftDate)
                  : null
              }
            : assignment.shift
        }))
      }
    })

    
    // Roster only — IVS-only imports stay off Positions until promoted
    const eventAssociations = await prisma.event_volunteers.findMany({
      where: {
        eventId: id as string,
        ...volunteerRosterWhere,
      },
      include: {
        volunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            formsOfService: true,
            congregation: true,
            isActive: true,
            user: {
              select: {
                role: true
              }
            }
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
        }
      }
    })

    // Map to attendants data with event-specific oversight
    const attendantsData = eventAssociations
      .filter(assoc => assoc.volunteer && assoc.volunteer.isActive)
      .map(assoc => ({
        id: assoc.volunteer!.id,
        firstName: assoc.volunteer!.firstName,
        lastName: assoc.volunteer!.lastName,
        formsOfService: assoc.volunteer!.formsOfService,
        congregation: assoc.volunteer!.congregation,
        isActive: assoc.volunteer!.isActive,
        user: assoc.volunteer!.user,
        overseerId: assoc.overseerId || null,
        keymanId: assoc.keymanId || null,
        overseer: assoc.overseer || null,
        keyman: assoc.keyman || null,
        isOverseer: assoc.isOverseer ?? false,
        isKeyman: assoc.isKeyman ?? false
      }))
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })

    const attendantsWithOversight = attendantsData.filter(att => att.overseerId)
    
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
    const positionsWithOversightData = positionsWithOversight.filter((p: any) => p.oversight && p.oversight.length > 0)
    positionsWithOversightData.forEach((p: any) => {
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
        canManageContent,
        canEdit,
        canDelete,
        canManagePermissions: canManagePerms,
        moduleConfig: (eventSettings?.settings as any)?.modules
          ? {
              countTimes: (eventSettings!.settings as any).modules.countTimes ?? true,
              lanyards: (eventSettings!.settings as any).modules.lanyards ?? true,
              ivsModule: (eventSettings!.settings as any).modules.ivsModule ?? false,
              positions: (eventSettings!.settings as any).modules.positions ?? true,
              documents: (eventSettings!.settings as any).modules.documents ?? true,
              announcements: (eventSettings!.settings as any).modules.announcements ?? true,
            }
          : null,
        terminology: (eventSettings?.settings as any)?.terminology || null
      }
    }

  } catch (error) {
    console.error('Error fetching event data:', error)
    return {
      notFound: true
    }
  }
}
