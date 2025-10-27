import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { format, parseISO } from 'date-fns'

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
  // APEX GUARDIAN: Oversight Management Fields (database field names)
  circuitoverseername?: string
  circuitoverseerphone?: string
  circuitoverseeremail?: string
  assemblyoverseername?: string
  assemblyoverseerphone?: string
  assemblyoverseeremail?: string
  attendantoverseername?: string
  attendantoverseerphone?: string
  attendantoverseeremail?: string
  attendantoverseerassistants?: any[]
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
  event_attendants: Array<{
    id: string
    users: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
  }>
  assignments: Array<{
    id: string
    users: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
    positions: {
      id: string
      positionNumber: number
      name: string
      area: string
    }
    shiftStart: string
    shiftEnd: string
    status: string
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
    event_attendants: number
    assignments: number
    positions: number
  }
}

interface EventDetailsPageProps {
  event: Event
  canEdit: boolean
  canDelete: boolean
  canManageContent: boolean // Can create positions, attendants, count sessions
}

export default function EventDetailsPage({ event, canEdit, canDelete, canManageContent }: EventDetailsPageProps) {
  const router = useRouter()
  
  // APEX GUARDIAN: Remove client-side fetching, use server-side props
  const [loading] = useState(false)
  const [error] = useState('')

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date'
    try {
      // Handle both ISO strings and date-only strings
      const date = dateString.includes('T') ? parseISO(dateString) : parseISO(dateString + 'T00:00:00')
      return format(date, 'EEEE, MMMM d, yyyy')
    } catch (error) {
      console.error('Date formatting error:', error, dateString)
      return 'Invalid date'
    }
  }

  const formatTime = (timeString: string) => {
    try {
      // Use date-fns for consistent time formatting
      const [hours, minutes] = timeString.split(':')
      const date = new Date(2000, 0, 1, parseInt(hours), parseInt(minutes))
      return format(date, 'h:mm a')
    } catch (error) {
      return timeString
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'No date'
    try {
      // Use date-fns for consistent SSR/client formatting
      return format(parseISO(dateString), 'MM/dd/yyyy, h:mm a')
    } catch (error) {
      console.error('DateTime formatting error:', error, dateString)
      return 'Invalid date'
    }
  }

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
    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        router.reload() // Refresh page data
        alert(`Event status updated to ${newStatus}`)
      } else {
        alert('Failed to update event status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating event status')
    }
  }

  const handleDeleteEvent = async () => {
    if (!event) return
    
    const confirmMessage = `⚠️ WARNING: This will PERMANENTLY DELETE the event "${event.name}" and all related data.\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:`
    const userInput = prompt(confirmMessage)
    
    if (userInput !== 'DELETE') {
      if (userInput !== null) {
        alert('Deletion cancelled. You must type "DELETE" exactly to confirm.')
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
        alert('Event deleted successfully')
        router.push('/events')
      } else {
        alert(data.error || 'Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Error deleting event')
    }
  }

  const handleCloneEvent = async () => {
    if (!event) return
    
    const eventName = prompt('Enter name for the cloned event:', `${event.name} (Copy)`)
    if (!eventName) return

    try {
      // Format dates properly for the API
      const startDate = typeof event.startDate === 'string' 
        ? event.startDate.split('T')[0]
        : new Date(event.startDate).toISOString().split('T')[0]
      const endDate = typeof event.endDate === 'string' 
        ? event.endDate.split('T')[0]
        : new Date(event.endDate).toISOString().split('T')[0]

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: eventName,
          description: event.description || '',
          eventType: event.eventType,
          startDate: startDate,
          endDate: endDate,
          startTime: event.startTime || '09:00',
          endTime: event.endTime || '17:00',
          location: event.location,
          capacity: event.capacity || 100,
          attendantsNeeded: event.attendantsNeeded || 10,
          status: 'UPCOMING'
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert('Event cloned successfully!')
        router.push(`/events/${data.data.id}`)
      } else {
        const errorData = await response.json()
        console.error('Clone event error:', errorData)
        alert(`Failed to clone event: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error cloning event:', error)
      alert('Error cloning event. Please try again.')
    }
  }

  const handleExportData = () => {
    if (!event) return
    
    const csvData = [
      ['Event Details'],
      ['Name', event.name],
      ['Type', event.eventType],
      ['Status', event.status],
      ['Start Date', formatDate(event.startDate)],
      ['End Date', formatDate(event.endDate)],
      ['Location', event.location || 'Not specified'],
      [''],
      ['Statistics'],
      ['Total Positions', event._count.positions.toString()],
      ['Total Assignments', event._count.assignments.toString()],
      ['Attendants Linked', event._count.event_attendants.toString()]
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

  if (loading) {
    return (
      <EventLayout 
        title="Loading Event..."
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Loading...' }
        ]}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading event...</p>
          </div>
        </div>
      </EventLayout>
    )
  }

  if (error || !event) {
    return (
      <EventLayout 
        title="Event Not Found"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Error' }
        ]}
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-700">{error || 'Event not found'}</p>
            <Link
              href="/events"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              ← Back to Events
            </Link>
          </div>
        </div>
      </EventLayout>
    )
  }

  return (
    <EventLayout 
      title={event.name}
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event.name }
      ]}
      selectedEvent={{
        id: event.id,
        name: event.name,
        status: event.status.toLowerCase() as any
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadge(event.status)}`}>
                  {event.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {getEventTypeLabel(event.eventType)} • {formatDate(event.startDate)}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              <Link
                href="/events"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
              >
                ← Back to Events
              </Link>
              <Link
                href={`/events/${event.id}/count-times`}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
              >
                📊 Count Times
              </Link>
              <Link
                href={`/events/${event.id}/attendants`}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
              >
                👥 Attendants
              </Link>
              <Link
                href={`/events/${event.id}/positions`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
              >
                📋 Positions
              </Link>
              <Link
                href={`/events/${event.id}/lanyards`}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
              >
                🏷️ Lanyards
              </Link>
              {canEdit && (
                <Link
                  href={`/events/${event.id}/edit`}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded transition-colors min-h-[44px] touch-manipulation flex items-center justify-center"
                >
                  ✏️ Edit Event
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* APEX GUARDIAN: Event Command Center Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Event Details */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Event Command Center</h3>
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
                  <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(event.startDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Date</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(event.endDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Start Time</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{formatTime(event.startTime)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Time</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {event.endTime ? formatTime(event.endTime) : 'Not specified'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{event.location}</p>
                </div>
                {event.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{event.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Capacity</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {event.capacity ? event.capacity.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Attendants Needed</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {event.attendantsNeeded ? event.attendantsNeeded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* APEX GUARDIAN: Assignment Progress Dashboard */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Assignment Progress Dashboard</h3>
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
                  <div className="text-2xl font-bold text-purple-600">{event._count.event_attendants}</div>
                  <div className="text-sm text-purple-600 font-medium">Attendants Linked</div>
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
              <div className="flex items-center justify-center p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100">
                {(() => {
                  // Calculate fill rate based on totalShiftsNeeded or positions
                  const totalNeeded = (event as any).totalShiftsNeeded || event._count.positions || 1
                  const fillRate = Math.min(100, (event._count.assignments / totalNeeded) * 100)
                  
                  if (fillRate >= 100) {
                    return (
                      <div className="flex items-center text-green-700">
                        <span className="text-2xl mr-2">✅</span>
                        <span className="font-bold">Event Ready - All Positions Filled</span>
                      </div>
                    )
                  } else if (fillRate >= 75) {
                    return (
                      <div className="flex items-center text-yellow-700">
                        <span className="text-2xl mr-2">⏳</span>
                        <span className="font-bold">Nearly Ready - {Math.round(100 - fillRate)}% Remaining</span>
                      </div>
                    )
                  } else {
                    return (
                      <div className="flex items-center text-red-700">
                        <span className="text-2xl mr-2">🔴</span>
                        <span className="font-bold">Needs Attention - {Math.round(100 - fillRate)}% Unfilled</span>
                      </div>
                    )
                  }
                })()}
              </div>
            </div>

            {/* APEX GUARDIAN: Count Times Summary */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Count Times Summary</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {event.countStats?.peakAttendance ?? '--'}
                  </div>
                  <div className="text-sm text-purple-600 font-medium">Peak Attendance</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {event.countStats?.averageCount ?? '--'}
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">Average Count</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {event.countStats?.sessionsTracked ?? 0}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Sessions Tracked</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {event.countStats?.currentSessionTally ?? '--'}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Current Session</div>
                </div>
              </div>
              
              {/* Session Breakdown */}
              {event.countStats?.sessionBreakdown && event.countStats.sessionBreakdown.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Session Breakdown</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {event.countStats.sessionBreakdown.map((session) => (
                      <div key={session.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{session.sessionName}</div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(session.countTime)} • {session.positionsReported} positions
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{session.totalCount}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Event Total */}
                  <div className="mt-4 bg-gradient-to-r from-purple-100 to-indigo-100 border-2 border-purple-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">Event Total</div>
                      <div className="text-3xl font-bold text-purple-600">{event.countStats.eventTotal || 0}</div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Sum of all session counts</div>
                  </div>
                </div>
              )}
              
              <div className="text-center mt-6">
                <Link
                  href={`/events/${event.id}/count-times`}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  📊 View Detailed Count Reports →
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* APEX GUARDIAN: Oversight Command Structure */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 border border-yellow-200 shadow-lg rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">👥</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Oversight Command</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Circuit Overseer</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {event.circuitoverseername || 'Not Assigned'}
                  </div>
                  {event.circuitoverseerphone && (
                    <div className="text-xs text-gray-600">📞 {event.circuitoverseerphone}</div>
                  )}
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assembly Overseer</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {event.assemblyoverseername || 'Not Assigned'}
                  </div>
                  {event.assemblyoverseerphone && (
                    <div className="text-xs text-gray-600">📞 {event.assemblyoverseerphone}</div>
                  )}
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Attendant Overseer</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {event.attendantoverseername || 'Not Assigned'}
                  </div>
                  {event.attendantoverseerphone && (
                    <div className="text-xs text-gray-600">📞 {event.attendantoverseerphone}</div>
                  )}
                </div>
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

            {/* APEX GUARDIAN: Enhanced Quick Actions */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                {/* Status Change Actions */}
                {event.status === 'UPCOMING' && (
                  <button
                    onClick={() => handleStatusChange('CURRENT')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    🚀 Start Event
                  </button>
                )}
                {event.status === 'CURRENT' && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    ✅ Complete Event
                  </button>
                )}
                
                {/* Enhanced Workflow Actions */}
                <Link
                  href={`/events/${event.id}/positions`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  📋 Manage Positions
                </Link>
                <Link
                  href={`/events/${event.id}/attendants`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  👥 View Attendants
                </Link>
                <Link
                  href={`/events/${event.id}/count-times`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  📊 Count Times
                </Link>
                <Link
                  href={`/events/${event.id}/documents`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  📄 Documents
                </Link>
                <Link
                  href={`/events/${event.id}/announcements`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  📢 Announcements
                </Link>
                <Link
                  href={`/events/${event.id}/lanyards`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🏷️ Lanyards
                </Link>
                <button
                  onClick={handleExportData}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📄 Generate Reports
                </button>
                {canEdit && (
                  <Link
                    href={`/events/${event.id}/edit`}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ⚙️ Event Settings
                  </Link>
                )}
                <Link
                  href={`/events/${event.id}/permissions`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-purple-300 bg-purple-50 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  🔐 Manage Permissions
                </Link>
                
                {/* Archive Action (only for completed events) */}
                {event.status === 'COMPLETED' && canEdit && (
                  <button
                    onClick={() => handleStatusChange('ARCHIVED')}
                    className="w-full flex items-center justify-center px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
                  >
                    📦 Archive Event
                  </button>
                )}
                
                {/* Delete Action (only for event owners) */}
                {canDelete && (
                  <button
                    onClick={handleDeleteEvent}
                    className="w-full flex items-center justify-center px-4 py-2 border border-red-300 bg-red-50 rounded-md text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                  >
                    🗑️ Delete Event
                  </button>
                )}
              </div>
            </div>

            {/* Event Timeline */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Event Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium">Event Created</div>
                    <div className="text-gray-500">{formatDate(event.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium">Last Updated</div>
                    <div className="text-gray-500">{formatDate(event.updatedAt)}</div>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium">Event Date</div>
                    <div className="text-gray-500">{formatDate(event.startDate)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EventLayout>
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
  if (session.user?.role === 'ATTENDANT') {
    return {
      redirect: {
        destination: '/attendant/dashboard',
        permanent: false,
      },
    }
  }

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN can access event management pages
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(session.user?.role || '')) {
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
    const fs = require('fs')
    fs.appendFileSync('/tmp/event-debug.log', `\n🔍 EVENT PAGE: Fetching event: ${id} at ${new Date().toISOString()}\n`)
    
    const { prisma } = await import('../../../src/lib/prisma')
    
    const event = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        event_attendants: {
          include: {
            users: true
          }
        },
        assignments: {
          include: {
            users: true
          }
        },
        positions: true
      }
    })

    console.log('🔍 EVENT PAGE: Event found?', !!event)
    if (!event) {
      console.log('🔍 EVENT PAGE: Event not found, returning 404')
      return {
        notFound: true,
      }
    }

    // Get total position assignments for this event
    // Query through positions first to avoid relation name issues
    const eventPositions = await prisma.positions.findMany({
      where: { eventId: id as string },
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
    
    console.log('🔍 FILL RATE DEBUG:', {
      totalPositions: eventPositions.length,
      totalAssignments,
      totalShiftsNeeded,
      fillRate: totalShiftsNeeded > 0 ? Math.round((totalAssignments / totalShiftsNeeded) * 100) : 0
    })

    // Get count statistics
    const countSessions = await prisma.count_sessions.findMany({
      where: { eventId: id as string },
      include: {
        position_counts: true
      },
      orderBy: {
        countTime: 'asc'
      }
    })
    
    // Calculate count statistics
    const allCounts = countSessions.flatMap(session => 
      session.position_counts.map(count => count.attendeeCount || 0)
    )
    const peakAttendance = allCounts.length > 0 ? Math.max(...allCounts) : null
    const averageCount = allCounts.length > 0 
      ? Math.round(allCounts.reduce((a, b) => a + b, 0) / allCounts.length)
      : null
    const sessionsTracked = countSessions.length
    
    // Get current session tally (most recent active session)
    const currentSession = countSessions.find(s => s.status === 'ACTIVE' && s.isActive)
    const currentSessionTally = currentSession
      ? currentSession.position_counts.reduce((sum, count) => sum + (count.attendeeCount || 0), 0)
      : null
    
    // Calculate session breakdown and event total
    const sessionBreakdown = countSessions.map(session => ({
      id: session.id,
      sessionName: session.sessionName,
      countTime: session.countTime.toISOString(),
      totalCount: session.position_counts.reduce((sum, count) => sum + (count.attendeeCount || 0), 0),
      positionsReported: session.position_counts.length,
      status: session.status
    }))
    
    // Calculate event total (sum of all session totals)
    const eventTotal = sessionBreakdown.reduce((sum, session) => sum + session.totalCount, 0)

    // Transform event data for frontend compatibility
    const transformedEvent = {
      ...event,
      startDate: event.startDate ? format(event.startDate, 'yyyy-MM-dd') : null,
      endDate: event.endDate ? format(event.endDate, 'yyyy-MM-dd') : null,
      createdAt: event.createdAt?.toISOString() || null,
      updatedAt: event.updatedAt?.toISOString() || null,
      totalShiftsNeeded,
      _count: {
        event_attendants: event.event_attendants?.length || 0,
        assignments: totalAssignments,
        positions: event.positions?.length || 0
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
    const { canManageEvent, canDeleteEvent, canManageAttendants } = await import('../../../src/lib/eventAccess')
    const userId = session.user?.id || ''
    console.log('🔍 EVENT PERMISSIONS CHECK:', {
      userId,
      userEmail: session.user?.email,
      eventId: id,
      eventName: event.name
    })
    
    // MANAGER or OWNER can edit event settings
    const canEdit = await canManageEvent(userId, id as string)
    
    // Only OWNER can delete event
    const canDelete = await canDeleteEvent(userId, id as string)
    
    // OWNER, MANAGER, or OVERSEER (no scope) can create positions/attendants/count sessions
    const canManageContent = await canManageAttendants(userId, id as string)
    
    console.log('🔍 PERMISSIONS RESULT:', { canEdit, canDelete, canManageContent })

    return {
      props: {
        event: transformedEvent,
        canEdit,
        canDelete,
        canManageContent,
      },
    }
  } catch (error) {
    const fs = require('fs')
    const errorMsg = error instanceof Error ? error.message : 'Unknown'
    const errorStack = error instanceof Error ? error.stack : 'No stack'
    fs.appendFileSync('/tmp/event-debug.log', `\n🔍 EVENT PAGE ERROR: ${errorMsg}\nStack: ${errorStack}\n`)
    return {
      notFound: true,
    }
  }
}
