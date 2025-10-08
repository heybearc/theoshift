import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

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
  event_attendant_associations: Array<{
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
    event_attendant_associations: number
    assignments: number
    positions: number
  }
}

interface EventDetailsPageProps {
  event: Event
}

export default function EventDetailsPage({ event }: EventDetailsPageProps) {
  const router = useRouter()
  
  // APEX GUARDIAN: Remove client-side fetching, use server-side props
  const [loading] = useState(false)
  const [error] = useState('')

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date'
    try {
      // Parse ISO date string directly to avoid timezone conversion
      // Input: "2025-11-01T00:00:00.000Z" -> Extract: "2025-11-01"
      const datePart = dateString.split('T')[0]
      const [year, month, day] = datePart.split('-')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      console.error('Date formatting error:', error, dateString)
      return 'Invalid date'
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
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
      ['Attendants Linked', event._count.event_attendant_associations.toString()]
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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                <span className={`px-3 py-1 text-sm rounded-full ${getStatusBadge(event.status)}`}>
                  {event.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {getEventTypeLabel(event.eventType)} • {formatDate(event.startDate)}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/events"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Events
              </Link>
              <div className="flex space-x-3">
              <Link
                href={`/events/${event.id}/count-times`}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                📊 Count Times
              </Link>
              <Link
                href={`/events/${event.id}/attendants`}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                👥 Attendants
              </Link>
              <Link
                href={`/events/${event.id}/positions`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                📋 Positions
              </Link>
              <Link
                href={`/events/${event.id}/lanyards`}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                🏷️ Lanyards
              </Link>
              <Link
                href={`/events/${event.id}/edit`}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ✏️ Edit Event
              </Link>
            </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Event Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event Type</label>
                  <p className="mt-1 text-sm text-gray-900">{getEventTypeLabel(event.eventType)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(event.status)}`}>
                    {event.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Start Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(event.startDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(event.endDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Start Time</label>
                  <p className="mt-1 text-sm text-gray-900">{formatTime(event.startTime)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">End Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {event.endTime ? formatTime(event.endTime) : 'Not specified'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1 text-sm text-gray-900">{event.location}</p>
                </div>
                {event.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{event.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Capacity</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {event.capacity ? event.capacity.toLocaleString() : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Attendants Needed</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {event.attendantsNeeded ? event.attendantsNeeded.toLocaleString() : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Positions ({event._count.positions})
                </h3>
                <Link
                  href={`/events/${event.id}/positions`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  ➕ Manage Positions
                </Link>
              </div>
              {event.positions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No positions created yet</p>
                  <Link
                    href={`/events/${event.id}/positions`}
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                  >
                    Create first position →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Assignments
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {event.positions.slice(0, 5).map((position) => (
                        <tr key={position.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{position.positionNumber} - {position.name}
                              </div>
                              {position.description && (
                                <div className="text-sm text-gray-500">{position.area || 'No area'}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {position.department || 'No department'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {position._count.assignments} assigned
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {event.positions.length > 5 && (
                    <div className="mt-3 text-center">
                      <Link
                        href={`/admin/events/${event.id}/positions`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View all {event.positions.length} positions →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Assignments */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Assignments ({event._count.assignments})
                </h3>
                <Link
                  href={`/events/${event.id}/assignments`}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  📋 Manage Assignments
                </Link>
              </div>
              {event.assignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No assignments yet</p>
                  <Link
                    href={`/events/${event.id}/assignments`}
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800"
                  >
                    Create first assignment →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Attendant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Shift
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {event.assignments.slice(0, 5).map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.users.firstName} {assignment.users.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{assignment.users.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              #{assignment.positions.positionNumber} - {assignment.positions.name}
                            </div>
                            <div className="text-sm text-gray-500">{assignment.positions.area}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(assignment.shiftStart)} - {formatTime(assignment.shiftEnd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getAssignmentStatusBadge(assignment.status)}`}>
                              {assignment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {event.assignments.length > 5 && (
                    <div className="mt-3 text-center">
                      <Link
                        href={`/events/${event.id}/assignments`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View all {event.assignments.length} assignments →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Positions</span>
                  <span className="text-sm font-medium text-gray-900">{event._count.positions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Assignments</span>
                  <span className="text-sm font-medium text-gray-900">{event._count.assignments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Attendants Linked</span>
                  <span className="text-sm font-medium text-gray-900">{event._count.event_attendant_associations}</span>
                </div>
                {event.attendantsNeeded && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Fill Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round((event._count.assignments / event.attendantsNeeded) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
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
                
                {/* Workflow Actions */}
                <button
                  onClick={handleExportData}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📊 Export Data
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  🖨️ Print Report
                </button>
                <button
                  onClick={handleCloneEvent}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📋 Clone Event
                </button>
                
                {/* Archive Action (only for completed events) */}
                {event.status === 'COMPLETED' && (
                  <button
                    onClick={() => handleStatusChange('ARCHIVED')}
                    className="w-full flex items-center justify-center px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
                  >
                    🗑️ Archive Event
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
                    <div className="text-gray-500">{new Date(event.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <div className="font-medium">Last Updated</div>
                    <div className="text-gray-500">{new Date(event.updatedAt).toLocaleDateString()}</div>
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

  // APEX GUARDIAN: Fetch event data server-side to eliminate client-side API issues
  const { id } = context.params!
  
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    
    const event = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        event_attendant_associations: {
          include: {
            users: true
          }
        },
        assignments: {
          include: {
            users: true
          }
        },
        positions: {
          include: {
            _count: {
              select: {
                assignments: true
              }
            }
          }
        }
      }
    })

    if (!event) {
      return {
        notFound: true,
      }
    }

    // Transform event data for frontend compatibility
    const transformedEvent = {
      ...event,
      startDate: event.startDate?.toISOString() || null,
      endDate: event.endDate?.toISOString() || null,
      createdAt: event.createdAt?.toISOString() || null,
      updatedAt: event.updatedAt?.toISOString() || null,
      _count: {
        event_attendant_associations: event.event_attendant_associations.length,
        assignments: event.assignments.length,
        positions: event.positions.length
      }
    }

    return {
      props: {
        event: transformedEvent,
      },
    }
  } catch (error) {
    console.error('Error fetching event:', error)
    return {
      notFound: true,
    }
  }
}
