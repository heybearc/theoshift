import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '../../components/AdminLayout'

interface DepartmentTemplate {
  id: string
  name: string
  description: string | null
  parentId: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  parent?: {
    id: string
    name: string
  } | null
  children?: {
    id: string
    name: string
    description: string | null
    icon: string | null
    sortOrder: number
    isActive: boolean
  }[]
  _count?: {
    event_departments: number
  }
}

interface DepartmentFormData {
  name: string
  description: string
  parentId: string
  icon: string
  sortOrder: number
  isActive: boolean
}

export default function DepartmentTemplatesPage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<DepartmentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentTemplate | null>(null)
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: '',
    parentId: '',
    icon: '',
    sortOrder: 0,
    isActive: true
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/department-templates?includeInactive=true')
      const data = await response.json()

      if (data.success) {
        setDepartments(data.data)
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

  const handleCreate = () => {
    setEditingDept(null)
    setFormData({
      name: '',
      description: '',
      parentId: '',
      icon: '',
      sortOrder: 0,
      isActive: true
    })
    setShowModal(true)
  }

  const handleEdit = (dept: DepartmentTemplate) => {
    setEditingDept(dept)
    setFormData({
      name: dept.name,
      description: dept.description || '',
      parentId: dept.parentId || '',
      icon: dept.icon || '',
      sortOrder: dept.sortOrder,
      isActive: dept.isActive
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const url = editingDept
        ? `/api/admin/department-templates/${editingDept.id}`
        : '/api/admin/department-templates'
      
      const method = editingDept ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          parentId: formData.parentId || null,
          icon: formData.icon || null,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(editingDept ? 'Department updated successfully' : 'Department created successfully')
        setShowModal(false)
        fetchDepartments()
      } else {
        setError(data.error || 'Failed to save department')
      }
    } catch (err) {
      setError('Error saving department')
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department template?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/department-templates/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Department deleted successfully')
        fetchDepartments()
      } else {
        setError(data.error || 'Failed to delete department')
      }
    } catch (err) {
      setError('Error deleting department')
      console.error(err)
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

  const parentDepartments = departments.filter(d => !d.parentId && d.id !== editingDept?.id)

  return (
    <AdminLayout title="Department Templates">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">
                Manage department templates that can be used across all events
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Create Department
            </button>
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

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading departments...</p>
          </div>
        ) : (
          /* Department List */
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sort Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events Using
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {dept.icon && <span className="mr-2 text-xl">{dept.icon}</span>}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                          {dept.description && (
                            <div className="text-sm text-gray-500">{dept.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.parent?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept.sortOrder}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(dept.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dept._count?.event_departments || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={dept._count && dept._count.event_departments > 0}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
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
                      Icon (Emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="👥"
                    />
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
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingDept ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
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
        permanent: false
      }
    }
  }

  return {
    props: {}
  }
}
