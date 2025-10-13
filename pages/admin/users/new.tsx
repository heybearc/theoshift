import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface Attendant {
  id: string
  firstName: string
  lastName: string
  email: string
  congregation: string
  isActive: boolean
}

export default function CreateUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [availableAttendants, setAvailableAttendants] = useState<Attendant[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'ATTENDANT',
    isActive: true,
    linkedAttendantId: '',
    sendInvitation: true
  })

  useEffect(() => {
    fetchAvailableAttendants()
  }, [])

  const fetchAvailableAttendants = async () => {
    try {
      const response = await fetch('/api/admin/attendants/available-for-linking')
      const result = await response.json()
      
      if (result.success) {
        setAvailableAttendants(result.data.attendants)
      }
    } catch (error) {
      console.error('Failed to fetch available attendants:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          linkedAttendantId: formData.linkedAttendantId || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        if (formData.sendInvitation) {
          setSuccess('User created successfully and invitation sent!')
        } else {
          setSuccess('User created successfully!')
        }
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'ATTENDANT',
          isActive: true,
          linkedAttendantId: '',
          sendInvitation: true
        })
        
        // Refresh available attendants
        fetchAvailableAttendants()
      } else {
        setError(result.error || 'Failed to create user')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout 
      title="Create New User"
      breadcrumbs={[
        { label: 'User Management', href: '/admin/users' },
        { label: 'Create User' }
      ]}
    >
      <div className="space-y-6">
        {/* Create User Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Create New User Account</h2>
            <div className="text-sm text-gray-500">
              Create a new user account with optional attendant linking
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="ATTENDANT">Attendant</option>
                  <option value="KEYMAN">Keyman</option>
                  <option value="ASSISTANT_OVERSEER">Assistant Overseer</option>
                  <option value="OVERSEER">Overseer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label htmlFor="isActive" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="isActive"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.isActive.toString()}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="linkedAttendantId" className="block text-sm font-medium text-gray-700">
                Link to Attendant Record (Optional)
              </label>
              <select
                id="linkedAttendantId"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.linkedAttendantId}
                onChange={(e) => setFormData({ ...formData, linkedAttendantId: e.target.value })}
              >
                <option value="">No attendant linked</option>
                {availableAttendants.map((attendant) => (
                  <option key={attendant.id} value={attendant.id}>
                    {attendant.firstName} {attendant.lastName} ({attendant.congregation})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Link this user account to an existing attendant record for role-based access
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="sendInvitation"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.sendInvitation}
                onChange={(e) => setFormData({ ...formData, sendInvitation: e.target.checked })}
              />
              <label htmlFor="sendInvitation" className="ml-2 block text-sm text-gray-900">
                Send email invitation to user
              </label>
            </div>
            <p className="text-sm text-gray-500 ml-6">
              If checked, an invitation email will be sent to the user with login instructions
            </p>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
            )}

            {success && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">{success}</div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/admin/users')}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">User Creation Options</h3>
          <div className="text-blue-700 space-y-2">
            <p><strong>Email Invitation:</strong> If enabled, the user will receive an email with login instructions and a link to set their password.</p>
            <p><strong>Attendant Linking:</strong> Link the user account to an existing attendant record to enable role-based access to their assignments and events.</p>
            <p><strong>Roles:</strong> Determine what level of access the user will have in the system (Admin {'>'}  Overseer {'>'}  Assistant Overseer {'>'}  Keyman {'>'}  Attendant).</p>
          </div>
        </div>

        {/* Available Attendants Info */}
        {availableAttendants.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-900 mb-2">Available Attendants for Linking</h3>
            <p className="text-green-700 mb-2">
              There are <strong>{availableAttendants.length}</strong> attendant records available for linking to user accounts.
            </p>
            <div className="text-sm text-green-600">
              Linking a user to an attendant record allows them to view their personal assignments and events when they log in.
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session || session.user?.role !== 'ADMIN') {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: {}
  }
}
