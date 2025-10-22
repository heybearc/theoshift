import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import EventLayout from '../../../components/EventLayout'

interface EventPermission {
  id: string
  userId: string
  role: string
  scopeType: string | null
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function EventPermissionsPage() {
  const router = useRouter()
  const { id: eventId } = router.query
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<EventPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canManage, setCanManage] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('VIEWER')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    if (eventId && status === 'authenticated') {
      loadPermissions()
    }
  }, [eventId, status])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/permissions`)
      const data = await response.json()

      if (data.success) {
        setPermissions(data.data.permissions)
        setCanManage(data.data.canManage)
      } else {
        setError(data.error || 'Failed to load permissions')
      }
    } catch (err) {
      setError('Failed to load permissions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      // First, find the user by email
      const userResponse = await fetch(`/api/users?email=${encodeURIComponent(inviteEmail)}`)
      const userData = await userResponse.json()

      if (!userData.success || !userData.data) {
        setError('User not found. They must have an account first.')
        return
      }

      // Grant permission
      const response = await fetch(`/api/events/${eventId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.data.id,
          role: inviteRole
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Successfully granted ${inviteRole} permission to ${inviteEmail}`)
        setShowInviteForm(false)
        setInviteEmail('')
        setInviteRole('VIEWER')
        loadPermissions()
      } else {
        setError(data.error || 'Failed to grant permission')
      }
    } catch (err) {
      setError('Failed to invite user')
      console.error(err)
    }
  }

  const handleEditRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/permissions/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Role updated successfully')
        setEditingUser(null)
        loadPermissions()
      } else {
        setError(data.error || 'Failed to update role')
      }
    } catch (err) {
      setError('Failed to update role')
    }
  }

  const handleRemovePermission = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user\'s access?')) return

    try {
      const response = await fetch(`/api/events/${eventId}/permissions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Permission removed successfully')
        loadPermissions()
      } else {
        setError(data.error || 'Failed to remove permission')
      }
    } catch (err) {
      setError('Failed to remove permission')
      console.error(err)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-red-100 text-red-800'
      case 'MANAGER': return 'bg-orange-100 text-orange-800'
      case 'OVERSEER': return 'bg-yellow-100 text-yellow-800'
      case 'KEYMAN': return 'bg-green-100 text-green-800'
      case 'VIEWER': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <EventLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading permissions...</div>
        </div>
      </EventLayout>
    )
  }

  if (!canManage) {
    return (
      <EventLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              You don't have permission to manage event permissions. Only event owners can manage permissions.
            </p>
          </div>
        </div>
      </EventLayout>
    )
  }

  return (
    <EventLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Event Permissions</h1>
          <p className="text-gray-600 mt-2">
            Manage who has access to this event and what they can do
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Invite User Form */}
        {showInviteForm && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite User</h3>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="VIEWER">Viewer - Read-only access</option>
                  <option value="KEYMAN">Keyman - Can edit own assignments</option>
                  <option value="OVERSEER">Overseer - Can manage within scope</option>
                  <option value="MANAGER">Manager - Full event management</option>
                  <option value="OWNER">Owner - Full control</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Grant Permission
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Current Permissions</h2>
            {!showInviteForm && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              >
                + Invite User
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-200">
            {permissions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No permissions found
              </div>
            ) : (
              permissions.map((permission) => (
                <div key={permission.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {permission.user.firstName} {permission.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{permission.user.email}</div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {editingUser === permission.userId ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="VIEWER">VIEWER</option>
                          <option value="KEYMAN">KEYMAN</option>
                          <option value="OVERSEER">OVERSEER</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="OWNER">OWNER</option>
                        </select>
                        <button
                          onClick={() => handleEditRole(permission.userId, newRole)}
                          className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(permission.role)}`}>
                          {permission.role}
                        </span>
                        {permission.scopeType && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                            {permission.scopeType}
                          </span>
                        )}
                      </>
                    )}
                    {canManage && (
                      <div className="flex space-x-2">
                        {editingUser !== permission.userId && (
                          <button
                            onClick={() => {
                              setEditingUser(permission.userId)
                              setNewRole(permission.role)
                            }}
                            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit role"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleRemovePermission(permission.userId)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove access"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Permission Roles</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>OWNER:</strong> Full control - can delete event and manage permissions</li>
            <li><strong>MANAGER:</strong> Can manage attendants, positions, and assignments</li>
            <li><strong>OVERSEER:</strong> Can manage within their scope (or full if no scope)</li>
            <li><strong>KEYMAN:</strong> Can only see and edit their assigned positions</li>
            <li><strong>VIEWER:</strong> Read-only access (for training/observation)</li>
          </ul>
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push(`/events/${eventId}`)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Event
          </button>
        </div>
      </div>
    </EventLayout>
  )
}
