import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../components/AdminLayout'
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
  _count: {
    event_attendant_associations: number
    assignments: number
    event_positions: number
  }
}

interface EventsResponse {
  success: boolean
  data: {
    events: Event[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  })

  // Filter states
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('startDate')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        eventType,
        status,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/admin/events?${params}`)
      const data: EventsResponse = await response.json()

      if (data.success) {
        setEvents(data.data.events)
        setPagination(data.data.pagination)
      } else {
        setError('Failed to fetch events')
      }
    } catch (error) {
      setError('Error fetching events')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [search, eventType, status, sortBy, sortOrder])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchEvents(1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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
      CIRCUIT_OVERSEER_VISIT: 'CO Visit',
      SPECIAL_EVENT: 'Special Event',
      MEETING: 'Meeting',
      MEMORIAL: 'Memorial',
      OTHER: 'Other'
    }
    return typeLabels[type as keyof typeof typeLabels] || type
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage events, assignments, and attendant scheduling
              </p>
            </div>
            <Link
              href="/admin/events/create"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              ➕ Create Event
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="ASSEMBLY">Assembly</option>
                <option value="CONVENTION">Convention</option>
                <option value="CIRCUIT_OVERSEER_VISIT">CO Visit</option>
                <option value="SPECIAL_EVENT">Special Event</option>
                <option value="MEETING">Meeting</option>
                <option value="MEMORIAL">Memorial</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="startDate">Start Date</option>
                <option value="name">Name</option>
                <option value="eventType">Type</option>
                <option value="status">Status</option>
                <option value="createdAt">Created</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔍 Search
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No events found</p>
              <Link
                href="/admin/events/create"
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Create First Event
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {event.name}
                            </div>
                            {event.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {event.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getEventTypeLabel(event.eventType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div>{formatDate(event.startDate)}</div>
                            <div className="text-gray-500">
                              {formatTime(event.startTime)}
                              {event.endTime && ` - ${formatTime(event.endTime)}`}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">{event.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(event.status)}`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex space-x-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {event._count.assignments} assigned
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              {event._count.event_positions} positions
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            📋 Manage
                          </Link>
                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            className="text-green-600 hover:text-green-900 transition-colors"
                          >
                            ✏️ Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page {pagination.page} of {pagination.pages} ({pagination.total} total events)
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchEvents(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                        {pagination.page}
                      </span>
                      <button
                        onClick={() => fetchEvents(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/admin/events/create"
            className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">➕</span>
            <span className="text-sm font-medium text-gray-900">Create Event</span>
          </Link>
          <button
            onClick={() => fetchEvents(pagination.page)}
            className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-medium text-gray-900">Refresh</span>
          </button>
          <Link
            href="/admin/events/import"
            className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl">📥</span>
            <span className="text-sm font-medium text-gray-900">Import Events</span>
          </Link>
          <Link
            href="/admin/events/reports"
            className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium text-gray-900">Reports</span>
          </Link>
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
