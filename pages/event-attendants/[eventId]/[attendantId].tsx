import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  createdAt: string
}

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
}

interface AttendantAssociation {
  id: string
  eventId: string
  userId: string
  role?: string
  notes?: string
  createdAt: string
  updatedAt: string
  users: User
  events: Event
}

interface Assignment {
  id: string
  eventId: string
  userId: string
  positionId: string
  shiftStart: string
  shiftEnd: string
  status: string
  notes?: string
  event_positions: {
    id: string
    positionNumber: number
    title: string
    department: string
    description?: string
  }
}

interface AttendantDetailsResponse {
  success: boolean
  data: {
    association: AttendantAssociation
    assignments: Assignment[]
  }
}

export default function AttendantDetailsPage() {
  const router = useRouter()
  const { id: eventId, attendantId } = router.query
  const [association, setAssociation] = useState<AttendantAssociation | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)

  // Edit form state
  const [editRole, setEditRole] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const fetchAttendantDetails = async () => {
    if (!eventId || !attendantId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/events/${eventId}/attendants/${attendantId}`)
      const data: AttendantDetailsResponse = await response.json()

      if (data.success) {
        setAssociation(data.data.association)
        setAssignments(data.data.assignments)
        setEditRole(data.data.association.role || '')
        setEditNotes(data.data.association.notes || '')
      } else {
        setError('Failed to fetch attendant details')
      }
    } catch (error) {
      setError('Error fetching attendant details')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendantDetails()
  }, [eventId, attendantId])

  const handleUpdate = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendants/${attendantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: editRole || undefined,
          notes: editNotes || undefined
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Attendant updated successfully!')
        setEditing(false)
        fetchAttendantDetails()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update attendant')
      }
    } catch (error) {
      setError('Error updating attendant')
      console.error('Error:', error)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this attendant from the event? This will also remove all their assignments.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendants/${attendantId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Attendant removed successfully!')
        setTimeout(() => {
          router.push(`/admin/events/${eventId}/attendants`)
        }, 1500)
      } else {
        setError(data.error || 'Failed to remove attendant')
      }
    } catch (error) {
      setError('Error removing attendant')
      console.error('Error:', error)
    }
  }

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

  const getRoleBadge = (userRole: string) => {
    const roleColors = {
      ADMIN: 'bg-red-100 text-red-800',
      OVERSEER: 'bg-purple-100 text-purple-800',
      ASSISTANT_OVERSEER: 'bg-blue-100 text-blue-800',
      KEYMAN: 'bg-green-100 text-green-800',
      ATTENDANT: 'bg-gray-100 text-gray-800'
    }
    return roleColors[userRole as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'
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
            <p className="ml-3 text-gray-600">Loading attendant details...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !association) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-700">{error || 'Attendant not found'}</p>
            <Link
              href={`/admin/events/${eventId}/attendants`}
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              ← Back to Attendants
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
              <h1 className="text-2xl font-bold text-gray-900">
                {association.users.firstName} {association.users.lastName}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Attendant for: <span className="font-medium">{association.events.name}</span>
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/admin/events/${eventId}/attendants`}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Attendants
              </Link>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                {editing ? '✕ Cancel Edit' : '✏️ Edit'}
              </button>
              <button
                onClick={handleRemove}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError('')} className="mt-2 text-red-600 hover:text-red-800">
              ✕ Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendant Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Attendant Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {association.users.firstName} {association.users.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{association.users.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">System Role</label>
                  <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${getRoleBadge(association.users.role)}`}>
                    {association.users.role}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event Role</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      placeholder="e.g., Security Team Leader"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      {association.role || 'Not specified'}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Notes</label>
                  {editing ? (
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      placeholder="Additional notes about this attendant..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      {association.notes || 'No notes'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Added to Event</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(association.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(association.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {editing && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setEditing(false)
                        setEditRole(association.role || '')
                        setEditNotes(association.notes || '')
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Assignments */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Assignments ({assignments.length})
                </h3>
                <Link
                  href={`/admin/events/${eventId}/assignments?attendant=${attendantId}`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  ➕ Add Assignment
                </Link>
              </div>
              {assignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No assignments yet</p>
                  <Link
                    href={`/admin/events/${eventId}/assignments?attendant=${attendantId}`}
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
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Shift Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{assignment.event_positions.positionNumber} - {assignment.event_positions.title}
                              </div>
                              {assignment.event_positions.description && (
                                <div className="text-sm text-gray-500">{assignment.event_positions.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {assignment.event_positions.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTime(assignment.shiftStart)} - {formatTime(assignment.shiftEnd)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getAssignmentStatusBadge(assignment.status)}`}>
                              {assignment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/admin/events/${eventId}/assignments/${assignment.id}`}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              📋 Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <span className="text-sm text-gray-500">Total Assignments</span>
                  <span className="text-sm font-medium text-gray-900">{assignments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Confirmed</span>
                  <span className="text-sm font-medium text-gray-900">
                    {assignments.filter(a => a.status === 'CONFIRMED').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Pending</span>
                  <span className="text-sm font-medium text-gray-900">
                    {assignments.filter(a => a.status === 'ASSIGNED').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Completed</span>
                  <span className="text-sm font-medium text-gray-900">
                    {assignments.filter(a => a.status === 'COMPLETED').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Event Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event Name</label>
                  <p className="mt-1 text-sm text-gray-900">{association.events.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event Type</label>
                  <p className="mt-1 text-sm text-gray-900">{association.events.eventType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(association.events.startDate)}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href={`/admin/events/${eventId}/assignments?attendant=${attendantId}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📋 Manage Assignments
                </Link>
                <Link
                  href={`/admin/events/${eventId}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  📅 View Event Details
                </Link>
                <Link
                  href={`/admin/users/${association.users.id}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  👤 View User Profile
                </Link>
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  🖨️ Print Details
                </button>
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
