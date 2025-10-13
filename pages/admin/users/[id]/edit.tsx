import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]'
import AdminLayout from '../../../../components/AdminLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  attendants?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface Attendant {
  id: string
  firstName: string
  lastName: string
  email: string
  congregation: string
  isActive: boolean
}

export default function EditUserPage() {
  const router = useRouter()
  const { id } = router.query
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [availableAttendants, setAvailableAttendants] = useState<Attendant[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'ATTENDANT',
    isActive: true,
    linkedAttendantId: ''
  })
  const [passwordData, setPasswordData] = useState({
    changePassword: false,
    newPassword: '',
    confirmPassword: '',
    sendResetEmail: false
  })

  useEffect(() => {
    if (id) {
      fetchUser()
      fetchAvailableAttendants()
    }
  }, [id])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${id}`)
      const result = await response.json()
      
      if (result.success) {
        const userData = result.data.user
        setUser(userData)
        setFormData({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
          isActive: userData.isActive,
          linkedAttendantId: userData.attendants?.id || ''
        })
      } else {
        setError(result.error || 'Failed to fetch user')
      }
    } catch (error) {
      setError('Error loading user')
    } finally {
      setLoading(false)
    }
  }

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
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ...(passwordData.changePassword && {
            newPassword: passwordData.newPassword,
            sendResetEmail: passwordData.sendResetEmail
          })
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('User updated successfully!')
        fetchUser() // Refresh user data
      } else {
        setError(result.error || 'Failed to update user')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        router.push('/admin/users')
      } else {
        setError(result.error || 'Failed to delete user')
      }
    } catch (error) {
      setError('Failed to delete user')
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Edit User" breadcrumbs={[
        { label: 'User Management', href: '/admin/users' },
        { label: 'Edit User' }
      ]}>
        <div className="text-center py-8">
          <div className="text-gray-500">Loading user...</div>
        </div>
      </AdminLayout>
    )
  }

  if (!user) {
    return (
      <AdminLayout title="User Not Found" breadcrumbs={[
        { label: 'User Management', href: '/admin/users' },
        { label: 'Edit User' }
      ]}>
        <div className="text-center py-8">
          <div className="text-red-500">User not found</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      title={`Edit User: ${user.firstName} ${user.lastName}`}
      breadcrumbs={[
        { label: 'User Management', href: '/admin/users' },
        { label: 'Edit User' }
      ]}
    >
      <div className="space-y-6">
        {/* User Edit Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">User Information</h2>
            <button
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              🗑️ Delete User
            </button>
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
                Link to Attendant Record
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

            {/* Password Management */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Password Management</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="changePassword"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={passwordData.changePassword}
                    onChange={(e) => setPasswordData({ 
                      ...passwordData, 
                      changePassword: e.target.checked,
                      newPassword: '',
                      confirmPassword: '',
                      sendResetEmail: false
                    })}
                  />
                  <label htmlFor="changePassword" className="ml-2 block text-sm text-gray-900">
                    🔑 Change user password
                  </label>
                </div>

                {passwordData.changePassword && (
                  <div className="ml-6 space-y-4 border-l-2 border-indigo-200 pl-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                          New Password *
                        </label>
                        <input
                          type="password"
                          id="newPassword"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          minLength={8}
                        />
                      </div>
                      <div>
                        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
                          Confirm New Password *
                        </label>
                        <input
                          type="password"
                          id="confirmNewPassword"
                          required
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          minLength={8}
                        />
                        {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                          <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="sendResetEmail"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        checked={passwordData.sendResetEmail}
                        onChange={(e) => setPasswordData({ ...passwordData, sendResetEmail: e.target.checked })}
                      />
                      <label htmlFor="sendResetEmail" className="ml-2 block text-sm text-gray-900">
                        📧 Send password change notification email
                      </label>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-700">
                        ⚠️ <strong>Security Note:</strong> The user will be required to log in again with the new password. 
                        If notification email is enabled, they will receive an email about the password change.
                      </p>
                    </div>
                  </div>
                )}

                {!passwordData.changePassword && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-sm text-gray-600">
                      💡 <strong>Password Reset Options:</strong> Check the box above to change the user's password, 
                      or use the "Send Password Reset Email" button to let them reset it themselves.
                    </p>
                    <button
                      type="button"
                      onClick={() => {/* TODO: Implement password reset email */}}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      📧 Send Password Reset Email
                    </button>
                  </div>
                )}
              </div>
            </div>

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
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Current Attendant Link Status */}
        {user.attendants && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-900 mb-2">Currently Linked Attendant</h3>
            <p className="text-green-700">
              This user is linked to: <strong>{user.attendants.firstName} {user.attendants.lastName}</strong>
            </p>
            <p className="text-sm text-green-600 mt-1">
              The user will have role-based access based on their attendant record and assignments.
            </p>
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
