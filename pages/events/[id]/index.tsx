import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
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
    event_positions: {
      id: string
      positionNumber: number
      title: string
      department: string
    }
    shiftStart: string
    shiftEnd: string
    status: string
  }>
  event_positions: Array<{
    id: string
    positionNumber: number
    title: string
    department: string
    description?: string
    _count: {
      assignments: number
    }
  }>
  _count: {
    event_attendant_associations: number
    assignments: number
    event_positions: number
  }
}

export default function EventDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchEvent = async () => {
    if (!id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${id}`)
      const data = await response.json()

      if (data.success) {
        setEvent(data.data)
      } else {
        setError(data.error || 'Failed to fetch event')
      }
    } catch (error) {
      setError('Error fetching event')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvent()
  }, [id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading event...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !event) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-700">{error || 'Event not found'}</p>
            <Link
              href="/admin/events"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              ← Back to Events
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
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
                href="/admin/events"
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Events
              </Link>
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ✏️ Edit Event
              </Link>
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
                  Positions ({event._count.event_positions})
                </h3>
                <Link
                  href={`/admin/events/${event.id}/positions`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  ➕ Manage Positions
                </Link>
              </div>
              {event.event_positions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No positions created yet</p>
                  <Link
                    href={`/admin/events/${event.id}/positions`}
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
                      {event.event_positions.slice(0, 5).map((position) => (
                        <tr key={position.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{position.positionNumber} - {position.title}
                              </div>
                              {position.description && (
                                <div className="text-sm text-gray-500">{position.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {position.department}
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
                  {event.event_positions.length > 5 && (
                    <div className="mt-3 text-center">
                      <Link
                        href={`/admin/events/${event.id}/positions`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View all {event.event_positions.length} positions →
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
                  href={`/admin/events/${event.id}/assignments`}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  📋 Manage Assignments
                </Link>
              </div>
              {event.assignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No assignments yet</p>
                  <Link
                    href={`/admin/events/${event.id}/assignments`}
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
                              #{assignment.event_positions.positionNumber} - {assignment.event_positions.title}
                            </div>
                            <div className="text-sm text-gray-500">{assignment.event_positions.department}</div>
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
                        href={`/admin/events/${event.id}/assignments`}
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
                  <span className="text-sm font-medium text-gray-900">{event._count.event_positions}</span>
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
                <Link
                  href={`/admin/events/${event.id}/attendants`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  👥 Manage Attendants
                </Link>
                <Link
                  href={`/admin/events/${event.id}/positions`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📍 Manage Positions
                </Link>
                <Link
                  href={`/admin/events/${event.id}/assignments`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📋 Manage Assignments
                </Link>
                <Link
                  href={`/admin/events/${event.id}/lanyards`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  🏷️ Manage Lanyards
                </Link>
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  🖨️ Print Report
                </button>
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
    </AdminLayout>
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

  return {
    props: {
      session,
    },
  }
}
