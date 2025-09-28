import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
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
  createdAt?: string
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
  events: {
    id: string
    name: string
  }
}

interface AttendantsResponse {
  success: boolean
  data: {
    associations: AttendantAssociation[]
    availableUsers: User[]
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

export default function EventAttendantsPage() {
  const router = useRouter()
  const { id: eventId } = router.query
  const [associations, setAssociations] = useState<AttendantAssociation[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [eventName, setEventName] = useState('')

  // Filter states
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  })

  const fetchAttendants = async (page = 1) => {
    if (!eventId) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        role
      })

      const response = await fetch(`/api/admin/events/${eventId}/attendants?${params}`)
      const data: AttendantsResponse = await response.json()

      if (data.success) {
        setAssociations(data.data.associations)
        setAvailableUsers(data.data.availableUsers)
        setPagination(data.data.pagination)
        
        // Set event name from first association
        if (data.data.associations.length > 0) {
          setEventName(data.data.associations[0].events.name)
        }
      } else {
        setError('Failed to fetch attendants')
      }
    } catch (error) {
      setError('Error fetching attendants')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendants()
  }, [eventId, search, role])

  const handleAddAttendant = async (userId: string, attendantRole?: string, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: attendantRole,
          notes
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Attendant added successfully!')
        setShowAddModal(false)
        fetchAttendants(pagination.page)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to add attendant')
      }
    } catch (error) {
      setError('Error adding attendant')
      console.error('Error:', error)
    }
  }

  const handleBulkAdd = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user')
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendants: selectedUsers.map(userId => ({ userId }))
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Successfully added ${data.data.created} attendants!`)
        setShowBulkModal(false)
        setSelectedUsers([])
        fetchAttendants(pagination.page)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to add attendants')
      }
    } catch (error) {
      setError('Error adding attendants')
      console.error('Error:', error)
    }
  }

  const handleRemoveAttendant = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this attendant from the event?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/attendants/${userId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Attendant removed successfully!')
        fetchAttendants(pagination.page)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to remove attendant')
      }
    } catch (error) {
      setError('Error removing attendant')
      console.error('Error:', error)
    }
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

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Attendants</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage attendants for: <span className="font-medium">{eventName}</span>
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/admin/events/${eventId}`}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Event
              </Link>
              <button
                onClick={() => setShowBulkModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                📥 Bulk Add
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ➕ Add Attendant
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

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Attendants
              </label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="OVERSEER">Overseer</option>
                <option value="ASSISTANT_OVERSEER">Assistant Overseer</option>
                <option value="KEYMAN">Keyman</option>
                <option value="ATTENDANT">Attendant</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchAttendants(1)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Attendants List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading attendants...</p>
            </div>
          ) : associations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No attendants associated with this event</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Add First Attendant
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        System Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {associations.map((association) => (
                      <tr key={association.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {association.users.firstName} {association.users.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{association.users.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(association.users.role)}`}>
                            {association.users.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {association.role || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">
                            {association.notes || 'No notes'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(association.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Link
                            href={`/admin/events/${eventId}/attendants/${association.userId}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            📋 Manage
                          </Link>
                          <button
                            onClick={() => handleRemoveAttendant(association.userId)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            🗑️ Remove
                          </button>
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
                      Showing page {pagination.page} of {pagination.pages} ({pagination.total} total attendants)
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchAttendants(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                        {pagination.page}
                      </span>
                      <button
                        onClick={() => fetchAttendants(pagination.page + 1)}
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

        {/* Add Single Attendant Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Attendant</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select User
                    </label>
                    <select
                      id="userSelect"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a user...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Role (Optional)
                    </label>
                    <input
                      type="text"
                      id="eventRole"
                      placeholder="e.g., Security Team Leader"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows={2}
                      placeholder="Additional notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const userSelect = document.getElementById('userSelect') as HTMLSelectElement
                      const eventRole = document.getElementById('eventRole') as HTMLInputElement
                      const notes = document.getElementById('notes') as HTMLTextAreaElement
                      
                      if (userSelect.value) {
                        handleAddAttendant(userSelect.value, eventRole.value, notes.value)
                      } else {
                        setError('Please select a user')
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Attendant
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Add Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Add Attendants</h3>
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {availableUsers.map(user => (
                      <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id])
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <p className="text-sm text-gray-600">
                    {selectedUsers.length} users selected
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowBulkModal(false)
                        setSelectedUsers([])
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkAdd}
                      disabled={selectedUsers.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add {selectedUsers.length} Attendants
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
