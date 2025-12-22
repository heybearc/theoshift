import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { prisma } from '../../../src/lib/prisma'

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface Department {
  id: string
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  template?: {
    id: string
    name: string
    icon: string | null
  } | null
  parent?: {
    id: string
    name: string
  } | null
  children?: {
    id: string
    name: string
    description: string | null
    isActive: boolean
  }[]
  _count?: {
    event_volunteers: number
  }
}

interface DepartmentTemplate {
  id: string
  name: string
  description: string | null
  icon: string | null
  parentId: string | null
}

interface EventDepartmentsPageProps {
  eventId: string
  event: Event
  canManageContent: boolean
}

export default function EventDepartmentsPage({ eventId, event, canManageContent }: EventDepartmentsPageProps) {
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [templates, setTemplates] = useState<DepartmentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    templateId: '',
    name: '',
    description: '',
    parentId: '',
    sortOrder: 0,
    isActive: true
  })

  useEffect(() => {
    fetchDepartments()
    fetchTemplates()
  }, [eventId])

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/departments?includeInactive=true&includeVolunteers=false`)
      const data = await response.json()

      if (data.success) {
        setDepartments(data.data.departments)
      } else {
        setError(data.error || 'Failed to fetch departments')
      }
    } catch (err) {
      setError('Error fetching departments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/department-templates?includeInactive=false')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.data)
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }

  const handleAdd = () => {
    setEditingDept(null)
    setFormData({
      templateId: '',
      name: '',
      description: '',
      parentId: '',
      sortOrder: 0,
      isActive: true
    })
    setShowAddModal(true)
  }

  const handleEdit = (dept: Department) => {
    setEditingDept(dept)
    setFormData({
      templateId: dept.template?.id || '',
      name: dept.name,
      description: dept.description || '',
      parentId: dept.parent?.id || '',
      sortOrder: dept.sortOrder,
      isActive: dept.isActive
    })
    setShowAddModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const url = editingDept
        ? `/api/events/${eventId}/departments/${editingDept.id}`
        : `/api/events/${eventId}/departments`
      
      const method = editingDept ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: formData.templateId || null,
          name: formData.name,
          description: formData.description || null,
          parentId: formData.parentId || null,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(editingDept ? 'Department updated successfully' : 'Department added successfully')
        setShowAddModal(false)
        fetchDepartments()
      } else {
        setError(data.error || 'Failed to save department')
      }
    } catch (err) {
      setError('Error saving department')
      console.error(err)
    }
  }

  const handleDelete = async (deptId: string) => {
    if (!confirm('Are you sure you want to remove this department from the event?')) {
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/departments/${deptId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Department removed successfully')
        fetchDepartments()
      } else {
        setError(data.error || 'Failed to remove department')
      }
    } catch (err) {
      setError('Error removing department')
      console.error(err)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        templateId,
        name: template.name,
        description: template.description || ''
      })
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
        Inactive
      </span>
    )
  }

  const parentDepartments = departments.filter(d => !d.parent && d.id !== editingDept?.id)

  return (
    <EventLayout eventId={eventId} event={event}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Event Departments</h1>
              <p className="mt-2 text-gray-600">
                Manage volunteer departments for this event
              </p>
            </div>
            {canManageContent && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add Department
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Departments</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{departments.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Active Departments</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {departments.filter(d => d.isActive).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Volunteers</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {departments.reduce((sum, d) => sum + (d._count?.event_volunteers || 0), 0)}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">No departments configured for this event yet.</p>
            {canManageContent && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Department
              </button>
            )}
          </div>
        ) : (
          /* Department Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div key={dept.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {dept.template?.icon && (
                      <span className="text-3xl mr-3">{dept.template.icon}</span>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                      {dept.parent && (
                        <p className="text-sm text-gray-500">Under: {dept.parent.name}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(dept.isActive)}
                </div>

                {dept.description && (
                  <p className="text-sm text-gray-600 mb-4">{dept.description}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{dept._count?.event_volunteers || 0}</span> volunteers
                  </div>
                  {canManageContent && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                        disabled={dept._count && dept._count.event_volunteers > 0}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {dept.children && dept.children.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">Sub-departments:</p>
                    <div className="space-y-1">
                      {dept.children.map(child => (
                        <div key={child.id} className="text-sm text-gray-600">
                          • {child.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingDept ? 'Edit Department' : 'Add Department'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {!editingDept && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Use Template (Optional)
                      </label>
                      <select
                        value={formData.templateId}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Custom Department</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.icon} {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Department
                    </label>
                    <select
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None (Top Level)</option>
                      {parentDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingDept ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
        permanent: false
      }
    }
  }

  const { id } = context.params as { id: string }

  try {
    const event = await prisma.events.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        eventType: true,
        startDate: true,
        endDate: true,
        status: true
      }
    })

    if (!event) {
      return { notFound: true }
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user!.email! },
      select: { id: true, role: true }
    })

    const canManageContent = user?.role === 'ADMIN' || user?.role === 'OVERSEER'

    return {
      props: {
        eventId: id,
        event: {
          ...event,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString()
        },
        canManageContent
      }
    }
  } catch (error) {
    console.error('Error fetching event:', error)
    return { notFound: true }
  }
}
