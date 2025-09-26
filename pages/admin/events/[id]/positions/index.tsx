import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../api/auth/[...nextauth]'
import AdminLayout from '../../../../../components/AdminLayout'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface Position {
  id: string
  eventId: string
  positionNumber: number
  title: string
  department: string
  description?: string
  requirements?: string
  skillsRequired: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  position_shifts: Array<{
    id: string
    shiftName: string
    shiftStart: string
    shiftEnd: string
  }>
  assignments: Array<{
    id: string
    users: {
      id: string
      firstName: string
      lastName: string
      email: string
    }
  }>
  _count: {
    assignments: number
    position_shifts: number
  }
}

interface Department {
  department: string
  _count: {
    department: number
  }
}

interface PositionsResponse {
  success: boolean
  data: {
    positions: Position[]
    departments: Department[]
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

export default function EventPositionsPage() {
  const router = useRouter()
  const { id: eventId } = router.query
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [eventName, setEventName] = useState('')

  // Filter states
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  })

  const fetchPositions = async (page = 1) => {
    if (!eventId) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search,
        department
      })

      const response = await fetch(`/api/admin/events/${eventId}/positions?${params}`)
      const data: PositionsResponse = await response.json()

      if (data.success) {
        setPositions(data.data.positions)
        setDepartments(data.data.departments)
        setPagination(data.data.pagination)
        
        // Get event name from first position or fetch separately
        if (data.data.positions.length > 0) {
          // We'll need to fetch event details separately since positions don't include event name
          fetchEventName()
        }
      } else {
        setError('Failed to fetch positions')
      }
    } catch (error) {
      setError('Error fetching positions')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEventName = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`)
      const data = await response.json()
      if (data.success) {
        setEventName(data.data.name)
      }
    } catch (error) {
      console.error('Error fetching event name:', error)
    }
  }

  useEffect(() => {
    fetchPositions()
  }, [eventId, search, department])

  const handleCreatePosition = async (formData: any) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Position created successfully!')
        setShowCreateModal(false)
        fetchPositions(pagination.page)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to create position')
      }
    } catch (error) {
      setError('Error creating position')
      console.error('Error:', error)
    }
  }

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to delete this position? This will also remove all related shifts and assignments.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/positions/${positionId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Position deleted successfully!')
        fetchPositions(pagination.page)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to delete position')
      }
    } catch (error) {
      setError('Error deleting position')
      console.error('Error:', error)
    }
  }

  const getDepartmentColor = (dept: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ]
    const hash = dept.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Positions</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage positions for: <span className="font-medium">{eventName}</span>
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
                📥 Bulk Create
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ➕ Create Position
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

        {/* Department Summary */}
        {departments.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Departments Overview</h3>
            <div className="flex flex-wrap gap-3">
              {departments.map((dept) => (
                <button
                  key={dept.department}
                  onClick={() => setDepartment(department === dept.department ? '' : dept.department)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    department === dept.department
                      ? 'bg-blue-600 text-white'
                      : `${getDepartmentColor(dept.department)} hover:opacity-80`
                  }`}
                >
                  {dept.department} ({dept._count.department})
                </button>
              ))}
              {department && (
                <button
                  onClick={() => setDepartment('')}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Positions
              </label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, department, or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="departmentFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Department
              </label>
              <select
                id="departmentFilter"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.department} value={dept.department}>
                    {dept.department} ({dept._count.department})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchPositions(1)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Positions List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading positions...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No positions created for this event</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Create First Position
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shifts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {positions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              #{position.positionNumber} - {position.title}
                            </div>
                            {position.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {position.description}
                              </div>
                            )}
                            {position.skillsRequired.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {position.skillsRequired.slice(0, 3).map((skill, index) => (
                                  <span key={index} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                    {skill}
                                  </span>
                                ))}
                                {position.skillsRequired.length > 3 && (
                                  <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                    +{position.skillsRequired.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getDepartmentColor(position.department)}`}>
                            {position.department}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {position._count.assignments} assigned
                            </span>
                            {position.assignments.length > 0 && (
                              <div className="flex -space-x-1">
                                {position.assignments.slice(0, 3).map((assignment) => (
                                  <div
                                    key={assignment.id}
                                    className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-700 border-2 border-white"
                                    title={`${assignment.users.firstName} ${assignment.users.lastName}`}
                                  >
                                    {assignment.users.firstName.charAt(0)}{assignment.users.lastName.charAt(0)}
                                  </div>
                                ))}
                                {position.assignments.length > 3 && (
                                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white">
                                    +{position.assignments.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            {position._count.position_shifts} shifts
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            position.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {position.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Link
                            href={`/admin/events/${eventId}/positions/${position.id}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            📋 Manage
                          </Link>
                          <Link
                            href={`/admin/events/${eventId}/positions/${position.id}/shifts`}
                            className="text-green-600 hover:text-green-900 transition-colors"
                          >
                            ⏰ Shifts
                          </Link>
                          <button
                            onClick={() => handleDeletePosition(position.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            🗑️ Delete
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
                      Showing page {pagination.page} of {pagination.pages} ({pagination.total} total positions)
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchPositions(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                        {pagination.page}
                      </span>
                      <button
                        onClick={() => fetchPositions(pagination.page + 1)}
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

        {/* Create Position Modal */}
        {showCreateModal && (
          <CreatePositionModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreatePosition}
            departments={departments.map(d => d.department)}
          />
        )}

        {/* Bulk Create Modal */}
        {showBulkModal && (
          <BulkCreateModal
            onClose={() => setShowBulkModal(false)}
            onSubmit={(positions) => {
              // Handle bulk create
              console.log('Bulk create positions:', positions)
              setShowBulkModal(false)
            }}
          />
        )}
      </div>
    </AdminLayout>
  )
}

// Create Position Modal Component
function CreatePositionModal({ onClose, onSubmit, departments }: {
  onClose: () => void
  onSubmit: (data: any) => void
  departments: string[]
}) {
  const [formData, setFormData] = useState({
    positionNumber: '',
    title: '',
    department: '',
    description: '',
    requirements: '',
    skillsRequired: '',
    isActive: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = {
      positionNumber: parseInt(formData.positionNumber),
      title: formData.title,
      department: formData.department,
      description: formData.description || undefined,
      requirements: formData.requirements || undefined,
      skillsRequired: formData.skillsRequired ? formData.skillsRequired.split(',').map(s => s.trim()) : [],
      isActive: formData.isActive
    }

    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Position</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position Number *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.positionNumber}
                onChange={(e) => setFormData({...formData, positionNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <input
                type="text"
                required
                list="departments"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="departments">
                {departments.map(dept => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Security Team Leader"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the position..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirements
            </label>
            <textarea
              rows={2}
              value={formData.requirements}
              onChange={(e) => setFormData({...formData, requirements: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Position requirements..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skills Required (comma-separated)
            </label>
            <input
              type="text"
              value={formData.skillsRequired}
              onChange={(e) => setFormData({...formData, skillsRequired: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Security, Leadership, Communication"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Position is active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Position
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Bulk Create Modal Component (simplified for now)
function BulkCreateModal({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (positions: any[]) => void
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Position Creation</h3>
          <p className="text-gray-600 mb-4">This feature will allow CSV import and bulk position creation.</p>
          <p className="text-sm text-gray-500">Coming soon in the next update!</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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
