import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventPageLayout from '../../../components/EventPageLayout'
import OversightCoverageCard from '../../../components/OversightCoverageCard'
import { TemplateProvider, useModuleConfig } from '../../../contexts/TemplateContext'
import { VolunteerText } from '../../../components/DynamicText'
import { SafeDate } from '../../../components/SafeDate'
import CloneEventModal, { CloneOptions } from '../../../components/CloneEventModal'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { format } from 'date-fns'
import { computeSessionAttendanceBreakdown } from '@/lib/countSessionReporting'
import { notifyAlert, toast } from '../../../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../../../lib/ui/confirm'
import { appPrompt } from '../../../lib/ui/prompt'
import { displayPhone } from '@/lib/formatPhone'
// Template types removed - using event.settings directly

interface Event {
  id: string
  name: string
  description?: string
  eventType: string
  startDate: string
  endDate: string
  startTime: string
  endTime?: string
  location: string
  capacity?: number
  attendantsNeeded?: number
  status: string
  createdAt: string
  updatedAt: string
  parentEventId?: string | null
  settings?: {
    modules?: {
      countTimes?: boolean
      lanyards?: boolean
      ivsModule?: boolean
      positions?: boolean
      documents?: boolean
      announcements?: boolean
    }
    terminology?: {
      volunteer?: string
      position?: string
      shift?: string
      assignment?: string
    }
    customFields?: Record<string, any>
    moduleOverrides?: Record<string, boolean>
  } | null
  // APEX GUARDIAN: Oversight Management Fields
  departmentOverseerName?: string
  departmentOverseerPhone?: string
  departmentOverseerEmail?: string
  departmentOverseerAssistants?: any[]
  keyman?: any[]
  childEvents?: Array<{
    id: string
    name: string
    eventType: string
    startDate: string
    endDate: string
    status: string
  }>
  parentEvent?: {
    id: string
    name: string
  } | null
  countStats?: {
    peakAttendance: number | null
    averageCount: number | null
    sessionsTracked: number
    currentSessionTally: number | null
    sessionBreakdown?: Array<{
      id: string
      sessionName: string
      countTime: string
      totalCount: number
      positionsReported: number
      status: string
    }>
    eventTotal?: number
  }
  event_volunteers: Array<{
    id: string
    volunteer?: {
      id: string
      firstName: string
      lastName: string
      email: string
    } | null
  }>
  positions: Array<{
    id: string
    positionNumber: number
    name: string
    area: string
    isActive: boolean
    department: string
  }>
  _count: {
    event_volunteers: number
    positions: number
    assignments: number
  }
}

interface EventDetailsPageProps {
  event: Event
  canEdit: boolean
  canDelete: boolean
  canManageContent: boolean
  canManagePermissions: boolean
}

function CountTimesSummary({ event }: { event: Event }) {
  const moduleConfig = useModuleConfig()
  const isCountTimesEnabled = moduleConfig?.countTimes === true

  if (!isCountTimesEnabled) return null

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200 min-w-0">
      <div className="flex items-start sm:items-center gap-3 mb-6 min-w-0">
        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-2xl">📈</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 min-w-0 break-words">Count Times Summary</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {event.countStats?.peakAttendance ?? '--'}
          </div>
          <div className="text-sm text-purple-600 font-medium mt-2">Peak Attendance</div>
        </div>
        {event.countStats?.currentSessionTally && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {event.countStats.currentSessionTally}
            </div>
            <div className="text-sm text-green-600 font-medium mt-2">Current Session</div>
          </div>
        )}
      </div>
      
      {/* Session Breakdown */}
      {event.countStats?.sessionBreakdown && event.countStats.sessionBreakdown.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Session Breakdown</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {event.countStats.sessionBreakdown.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-3 border border-gray-200 min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 break-words">{session.sessionName}</div>
                  <div className="text-xs text-gray-500 break-words">
                    <SafeDate dateString={session.countTime} format="datetime" /> •{' '}
                    {session.positionsReported} positions
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-lg font-bold text-purple-600">{session.totalCount}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-center mt-6">
        <Link
          href={`/events/${event.id}/count-times`}
          className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-3 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors touch-manipulation"
        >
          📊 View Detailed Count Reports →
        </Link>
      </div>
    </div>
  )
}

export default function EventDetailsPage({ event, canEdit, canDelete, canManageContent, canManagePermissions }: EventDetailsPageProps) {
  const router = useRouter()
  const [showCloneModal, setShowCloneModal] = useState(false)

  const getStatusBadge = (status: string) => {
    const statusColors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PUBLISHED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getEventTypeLabel = (type: string) => {
    const typeLabels = {
      ASSEMBLY: 'Assembly',
      CONVENTION: 'Convention',
      CIRCUIT_OVERSEER_VISIT: 'Circuit Overseer Visit',
      SPECIAL_EVENT: 'Special Event',
      MEETING: 'Meeting',
      MEMORIAL: 'Memorial',
      OTHER: 'Other'
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  const getAssignmentStatusBadge = (status: string) => {
    const statusColors = {
      ASSIGNED: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      NO_SHOW: 'bg-gray-100 text-gray-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  // Quick Actions functions
  const handleStatusChange = async (newStatus: string) => {
    if (!event) return
    
    const confirmMessage = `Are you sure you want to change the event status to ${newStatus}?`
    if (!(await appConfirmMessage(confirmMessage))) return

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        router.reload() // Refresh page data
        notifyAlert(`Event status updated to ${newStatus}`)
      } else {
        notifyAlert('Failed to update event status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      notifyAlert('Error updating event status')
    }
  }

  const handleDeleteEvent = async () => {
    if (!event) return

    const userInput = await appPrompt({
      title: 'Delete event permanently?',
      message: `This will permanently delete "${event.name}" and all related data. This action cannot be undone.`,
      requiredValue: 'DELETE',
      inputLabel: 'Type DELETE to confirm',
      confirmLabel: 'Delete event',
      tone: 'danger',
    })

    if (userInput !== 'DELETE') {
      if (userInput !== null) {
        toast.info('Deletion cancelled. Type DELETE exactly to confirm.')
      }
      return
    }

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        notifyAlert('Event deleted successfully')
        router.push('/events')
      } else {
        notifyAlert(data.error || 'Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      notifyAlert('Error deleting event')
    }
  }

  const handleCloneEvent = async (options: CloneOptions) => {
    if (!event) return

    try {
      const response = await fetch(`/api/events/${event.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(options)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowCloneModal(false)
        notifyAlert(data.data.message || 'Event cloned successfully!')
        router.push(`/events/${data.data.id}`)
      } else {
        console.error('Clone event error:', data)
        notifyAlert(`Failed to clone event: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error cloning event:', error)
      notifyAlert('Error cloning event')
    }
  }

  const handleExportData = () => {
    if (!event) return
    
    const csvData = [
      ['Event Details'],
      ['Name', event.name],
      ['Type', event.eventType],
      ['Status', event.status],
      ['Start Date', event.startDate],
      ['End Date', event.endDate],
      ['Location', event.location || 'Not specified'],
      [''],
      ['Statistics'],
      ['Total Positions', event._count.positions.toString()],
      ['Total Assignments', event._count.assignments.toString()],
      ['Attendants Linked', event._count.event_volunteers.toString()]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!event) {
    console.error('No event data available')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600">Unable to load event data</p>
        </div>
      </div>
    )
  }

  // Use event.settings.modules directly
  const effectiveModuleConfig = event.settings?.modules
    ? {
        countTimes: event.settings.modules.countTimes ?? true,
        lanyards: event.settings.modules.lanyards ?? true,
        ivsModule: event.settings.modules.ivsModule ?? false,
        positions: event.settings.modules.positions ?? true,
        documents: event.settings.modules.documents ?? true,
        announcements: event.settings.modules.announcements ?? true,
        customFields: []
      }
    : null

  // Use event.settings.terminology directly
  const effectiveTerminology = event.settings?.terminology || null

  return (
    <TemplateProvider
      moduleConfig={effectiveModuleConfig}
      terminology={effectiveTerminology}
      eventModuleOverrides={event.settings?.moduleOverrides || null}
    >
      <EventPageLayout
        event={{
          id: event.id,
          name: event.name,
          status: event.status,
          eventType: event.eventType,
          startDate: event.startDate
        }}
        currentPage="overview"
        canEdit={canEdit}
        canDelete={canDelete}
        canManagePermissions={canManagePermissions}
        onStatusChange={handleStatusChange}
      >


        {/* APEX GUARDIAN: Event Command Center Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            {/* Enhanced Event Details */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl shadow-lg p-4 sm:p-6 min-w-0">
              <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-1 sm:mr-0 shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 min-w-0 break-words">
                  Event Command Center
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event Type</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{getEventTypeLabel(event.eventType)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`mt-1 inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(event.status)}`}>
                    {event.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Start Date</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900"><SafeDate dateString={event.startDate} format="full" /></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Date</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900"><SafeDate dateString={event.endDate} format="full" /></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Start Time</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900"><SafeDate dateString={event.startTime} format="time" /></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Time</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {event.endTime ? <SafeDate dateString={event.endTime} format="time" /> : 'Not specified'}
                  </p>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <label className="block text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900 break-words">{event.location}</p>
                </div>
                {event.description && (
                <div className="md:col-span-2 min-w-0">
                  <label className="block text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-sm text-gray-900 break-words">{event.description}</p>
                </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Capacity</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {event.capacity ? event.capacity.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500"><VolunteerText plural /> Needed</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {event.attendantsNeeded ? event.attendantsNeeded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Parent Event Info */}
            {event.parentEvent && (
              <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200 min-w-0">
                <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-2xl">🔗</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 min-w-0 break-words">
                    Event Relationships
                  </h3>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-blue-700 mb-2">Parent Event</label>
                  <Link
                    href={`/events/${event.parentEvent.id}`}
                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                  >
                    {event.parentEvent.name} →
                  </Link>
                </div>
              </div>
            )}


            {/* Child Events Section */}
            {event.childEvents && event.childEvents.length > 0 && (
              <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200 min-w-0">
                <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
                  <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 min-w-0 break-words">
                    Child Events ({event.childEvents.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {event.childEvents.map((childEvent) => (
                    <Link
                      key={childEvent.id}
                      href={`/events/${childEvent.id}`}
                      className="block bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 break-words">{childEvent.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1 min-w-0">
                              <span className="shrink-0">📋</span>
                              <span className="break-words">{getEventTypeLabel(childEvent.eventType)}</span>
                            </span>
                            <span className="flex flex-wrap items-center gap-1 min-w-0">
                              <span className="shrink-0">📅</span>
                              <span className="break-words">
                                <SafeDate dateString={childEvent.startDate} format="full" /> -{' '}
                                <SafeDate dateString={childEvent.endDate} format="full" />
                              </span>
                            </span>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full shrink-0 ${getStatusBadge(childEvent.status)}`}
                            >
                              {childEvent.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-teal-600 font-bold shrink-0 self-end sm:self-auto">→</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* APEX GUARDIAN: Assignment Progress Dashboard - Only show if positions module is enabled */}
            {effectiveModuleConfig?.positions !== false && (
              <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200 min-w-0">
                <div className="flex items-start sm:items-center gap-3 mb-6 min-w-0">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 min-w-0 break-words">
                    Assignment Progress Dashboard
                  </h3>
                </div>
              
              {/* Progress Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{event._count.positions}</div>
                  <div className="text-sm text-blue-600 font-medium">Total Positions</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{event._count.assignments}</div>
                  <div className="text-sm text-green-600 font-medium">Assignments Made</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{event._count.event_volunteers}</div>
                  <div className="text-sm text-purple-600 font-medium"><VolunteerText plural /> Linked</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(() => {
                      const totalNeeded = (event as any).totalShiftsNeeded || event._count.positions || 1
                      const fillRate = totalNeeded > 0 ? (event._count.assignments / totalNeeded) * 100 : 0
                      return Math.min(100, Math.round(fillRate))
                    })()}%
                  </div>
                  <div className="text-sm text-orange-600 font-medium">Fill Rate</div>
                </div>
              </div>

              {/* Progress Bar */}
              {event._count.positions > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Assignment Progress</span>
                    <span>{event._count.assignments} shifts assigned</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${event._count.assignments > 0 ? 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  {event._count.assignments === 0 && (
                    <p className="text-xs text-gray-500 mt-1">No assignments yet - use Smart Auto-Assign to fill positions</p>
                  )}
                </div>
              )}

              {/* Readiness Indicator */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 text-center sm:text-left">
                {(() => {
                  // Calculate fill rate based on totalShiftsNeeded or positions
                  const totalNeeded = (event as any).totalShiftsNeeded || event._count.positions || 1
                  const fillRate = Math.min(100, (event._count.assignments / totalNeeded) * 100)
                  
                  if (fillRate >= 100) {
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-2 text-green-700 px-1">
                        <span className="text-2xl shrink-0">✅</span>
                        <span className="font-bold text-sm sm:text-base leading-snug break-words">
                          Event Ready - All Positions Filled
                        </span>
                      </div>
                    )
                  } else if (fillRate >= 75) {
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-2 text-yellow-700 px-1">
                        <span className="text-2xl shrink-0">⏳</span>
                        <span className="font-bold text-sm sm:text-base leading-snug break-words">
                          Nearly Ready - {Math.round(100 - fillRate)}% Remaining
                        </span>
                      </div>
                    )
                  } else {
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-2 text-red-700 px-1">
                        <span className="text-2xl shrink-0">🔴</span>
                        <span className="font-bold text-sm sm:text-base leading-snug break-words">
                          Needs Attention - {Math.round(100 - fillRate)}% Unfilled
                        </span>
                      </div>
                    )
                  }
                })()}
              </div>
              </div>
            )}

            {/* Count Times Summary */}
            <CountTimesSummary event={event} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 min-w-0">
            {/* APEX GUARDIAN: Oversight Command Structure */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 border border-yellow-200 shadow-lg rounded-xl p-4 sm:p-6 min-w-0">
              <div className="flex items-start sm:items-center gap-3 mb-4 min-w-0">
                <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xl">👥</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 min-w-0 break-words">
                  Oversight Command
                </h3>
              </div>
              <div className="space-y-3">
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Department Overseer</div>
                  <div className="text-base font-bold text-gray-900">{event.departmentOverseerName}</div>
                  {event.departmentOverseerPhone && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                      <span>📞</span>
                      <span>{displayPhone(event.departmentOverseerPhone)}</span>
                    </div>
                  )}
                  {event.departmentOverseerEmail && (
                    <div className="flex items-start gap-1 mt-0.5 text-xs text-gray-500 min-w-0">
                      <span className="shrink-0">✉️</span>
                      <span className="break-all">{event.departmentOverseerEmail}</span>
                    </div>
                  )}
                  
                  {event.departmentOverseerAssistants && Array.isArray(event.departmentOverseerAssistants) && event.departmentOverseerAssistants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assistants</div>
                      <div className="space-y-2">
                        {event.departmentOverseerAssistants.map((assistant: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <div className="font-medium text-gray-800">{assistant.name}</div>
                            {assistant.phone && (
                              <div className="text-xs text-gray-600 mt-0.5">📞 {assistant.phone}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {event.keyman && Array.isArray(event.keyman) && event.keyman.length > 0 && (
                  <div className="bg-white bg-opacity-60 rounded-lg p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Keymen</div>
                    <div className="space-y-2">
                      {event.keyman.map((keyman: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <div className="font-medium text-gray-800">{keyman.name}</div>
                          {keyman.phone && (
                            <div className="text-xs text-gray-600 mt-0.5">📞 {displayPhone(keyman.phone)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="mt-4 pt-3 border-t border-yellow-200">
                  <Link
                    href={`/events/${event.id}/edit`}
                    className="text-xs text-yellow-700 hover:text-yellow-800 font-medium"
                  >
                    ⚙️ Manage Oversight →
                  </Link>
                </div>
              )}
            </div>

            {/* Phase 5B: Oversight Coverage Card */}
            <OversightCoverageCard eventId={event.id} />

            {/* Event Timeline */}
            <div className="bg-white shadow rounded-lg p-4 sm:p-6 min-w-0">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 break-words">
                Event Timeline
              </h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium">Event Created</div>
                    <div className="text-gray-500"><SafeDate dateString={event.createdAt} format="full" /></div>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium">Last Updated</div>
                    <div className="text-gray-500"><SafeDate dateString={event.updatedAt} format="full" /></div>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium">Event Date</div>
                    <div className="text-gray-500"><SafeDate dateString={event.startDate} format="full" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </EventPageLayout>
    </TemplateProvider>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  // CRITICAL: Block attendants from accessing admin event pages
  if (session.user?.role === 'VOLUNTEER') {
    return {
      redirect: {
        destination: '/attendant/dashboard',
        permanent: false,
      },
    }
  }

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN can access event management pages
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  // APEX GUARDIAN: Check event-specific permissions
  const { id } = context.params!
  
  // Import event access utilities
  const { checkEventAccess } = await import('../../../src/lib/eventAccess')
  
  // Check if user has at least VIEWER access to this event
  const eventPermission = await checkEventAccess(session.user?.id || '', id as string, 'VIEWER')
  
  if (!eventPermission) {
    // User doesn't have permission to view this event
    return {
      redirect: {
        destination: '/events/select',
        permanent: false,
      },
    }
  }

  // APEX GUARDIAN: Fetch event data server-side to eliminate client-side API issues
  
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    
    const event = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        event_volunteers: {
          where: {
            ivsApprovalStatus: null
          },
          include: {
            volunteer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        positions: true,
        childEvents: {
          select: {
            id: true,
            name: true,
            eventType: true,
            startDate: true,
            endDate: true,
            status: true
          },
          orderBy: {
            startDate: 'asc'
          }
        },
        parentEvent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!event) {
      return {
        notFound: true,
      }
    }

    // Get total position assignments for this event
    // Query through positions first to avoid relation name issues
    // ONLY count active positions for fill rate calculation
    const eventPositions = await prisma.positions.findMany({
      where: { 
        eventId: id as string,
        isActive: true
      },
      include: {
        shifts: true
      }
    })
    const positionIds = eventPositions.map(p => p.id)
    const totalAssignments = await prisma.position_assignments.count({
      where: {
        positionId: { in: positionIds }
      }
    })
    
    // Calculate total shifts needed (positions with shifts = sum of shifts, positions without = 1 per position)
    const totalShiftsNeeded = eventPositions.reduce((total, position) => {
      return total + (position.shifts.length > 0 ? position.shifts.length : 1)
    }, 0)
    
    // Calculate fill rate
    const fillRate = totalShiftsNeeded > 0 ? Math.round((totalAssignments / totalShiftsNeeded) * 100) : 0

    // Get count statistics (includes station-group entries, not only position_counts rows)
    const countSessions = await prisma.count_sessions.findMany({
      where: { eventId: id as string },
      include: {
        position_counts: true
      },
      orderBy: {
        countTime: 'asc'
      }
    })

    const sessionBreakdown = await Promise.all(
      countSessions.map(async (session) => {
        const breakdown = await computeSessionAttendanceBreakdown(session.id)
        return {
          id: session.id,
          sessionName: session.sessionName,
          countTime: session.countTime?.toISOString() || new Date().toISOString(),
          totalCount: breakdown.attendeeTotal,
          positionsReported: breakdown.reportingSlots,
          status: session.status
        }
      })
    )

    const sessionTotals = sessionBreakdown.map((s) => s.totalCount)
    const peakAttendance = sessionTotals.length > 0 ? Math.max(...sessionTotals) : null
    const averageCount =
      sessionTotals.length > 0 ? Math.round(sessionTotals.reduce((a, b) => a + b, 0) / sessionTotals.length) : null
    const sessionsTracked = countSessions.length

    const currentSession = countSessions.find((s) => s.status === 'ACTIVE' && s.isActive)
    const currentSessionTally = currentSession
      ? sessionBreakdown.find((row) => row.id === currentSession.id)?.totalCount ?? null
      : null

    const eventTotal = sessionBreakdown.reduce((sum, session) => sum + session.totalCount, 0)

    // Transform event data for frontend compatibility
    const transformedEvent = {
      ...event,
      startDate: event.startDate ? format(event.startDate, 'yyyy-MM-dd') + 'T12:00:00' : null,
      endDate: event.endDate ? format(event.endDate, 'yyyy-MM-dd') + 'T12:00:00' : null,
      createdAt: event.createdAt?.toISOString() || null,
      updatedAt: event.updatedAt?.toISOString() || null,
      totalShiftsNeeded,
      childEvents: (event as any).childEvents?.map((child: any) => ({
        ...child,
        startDate: child.startDate ? format(child.startDate, 'yyyy-MM-dd') : null,
        endDate: child.endDate ? format(child.endDate, 'yyyy-MM-dd') : null
      })) || [],
      parentEvent: (event as any).parentEvent || null,
      _count: {
        event_volunteers: (event as any).event_volunteers?.length || 0,
        assignments: totalAssignments,
        positions: (event as any).positions?.length || 0
      },
      countStats: {
        peakAttendance,
        averageCount,
        sessionsTracked,
        currentSessionTally,
        sessionBreakdown,
        eventTotal
      }
    }

    // Check event-specific permissions
    const { canManageEvent, canDeleteEvent, canManageAttendants, canManagePermissions } = await import('../../../src/lib/eventAccess')
    const userId = session.user?.id || ''
    
    // ADMIN or COORDINATOR can edit event settings
    const canEdit = await canManageEvent(userId, id as string)
    
    // Only ADMIN can delete event
    const canDelete = await canDeleteEvent(userId, id as string)
    
    // ADMIN or COORDINATOR can create positions/attendants/count sessions
    const canManageContent = await canManageAttendants(userId, id as string)
    
    // Only ADMIN can manage permissions
    const canManagePerms = await canManagePermissions(userId, id as string)

    console.log('======================================')
    console.log('EVENT PAGE - Returning props for event:', id)
    console.log('Event name:', transformedEvent.name)
    console.log('Event has settings:', !!transformedEvent.settings)
    console.log('======================================')

    return {
      props: {
        event: transformedEvent,
        canEdit,
        canDelete,
        canManageContent,
        canManagePermissions: canManagePerms,
      },
    }
  } catch (error) {
    console.error('======================================')
    console.error('EVENT PAGE ERROR:', error)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('======================================')
    return {
      props: {
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: error?.constructor?.name || 'Unknown'
        }
      } as any
    }
  }
}
