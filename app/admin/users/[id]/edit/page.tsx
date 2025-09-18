'use client'

import { useAuth } from '../../../../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
  inviteToken: string | null
  inviteExpiry: string | null
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'ATTENDANT',
    isActive: true,
  })

  useEffect(() => {
    if (authLoading) return
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }

    fetchUser()
  }, [user, authLoading, router, params.id])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserData(data)
        setFormData({
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          role: data.role || 'ATTENDANT',
          isActive: data.isActive ?? true,
        })
      } else if (response.status === 404) {
        alert('User not found')
        router.push('/admin')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      alert('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('User updated successfully!')
        router.push('/admin')
      } else {
        const error = await response.json()
        alert(`Failed to update user: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate this user? This action will set their status to inactive.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('User deactivated successfully!')
        router.push('/admin')
      } else {
        const error = await response.json()
        alert(`Failed to deactivate user: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to deactivate user:', error)
      alert('Failed to deactivate user')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">User not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Edit User</h1>
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Admin
            </Link>
          </div>

          {userData.inviteToken && userData.inviteExpiry && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-800">Pending Invitation</h3>
              <p className="text-yellow-700">
                This user has a pending invitation that expires on{' '}
                {new Date(userData.inviteExpiry).toLocaleDateString()}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="ATTENDANT">Attendant</option>
                <option value="KEYMAN">Keyman</option>
                <option value="ASSISTANT_OVERSEER">Assistant Overseer</option>
                <option value="OVERSEER">Overseer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">User is active</span>
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">User Information</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Created:</strong> {new Date(userData.createdAt).toLocaleString()}</p>
                <p><strong>Last Updated:</strong> {new Date(userData.updatedAt).toLocaleString()}</p>
                <p><strong>Last Login:</strong> {userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never'}</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
                Deactivate User
              </button>
              <div className="space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
