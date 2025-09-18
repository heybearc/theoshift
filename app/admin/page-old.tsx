'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Client error caught:', error)
      setHasError(true)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <button 
            onClick={() => setHasError(false)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

function AdminDashboardContent() {
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Manual auth check instead of useAuth hook
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          router.push('/auth/signin')
          return
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setAuthError('Authentication failed')
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (authLoading) return
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }

    fetchUsers()
  }, [user, authLoading, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to update user status:', error)
    }
  }

  const resendInvitation = async (userId: string, email: string) => {
    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        alert(`Invitation resent to ${email}`)
      } else {
        alert('Failed to resend invitation')
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      alert('Failed to resend invitation')
    }
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{authError}</div>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <div className="space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/admin/email-config"
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Email Config
              </Link>
              <Link
                href="/admin/users/import"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Import Users
              </Link>
              <Link
                href="/admin/users/new"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add User
              </Link>
            </div>
          </div>

          {/* Admin Sub-Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* User Management */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
                  <p className="text-sm text-gray-600">Manage users, roles, and permissions</p>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/users"
                  className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  View All Users
                </Link>
                <Link
                  href="/admin/users/import"
                  className="block w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                >
                  Import Users
                </Link>
              </div>
            </div>

            {/* Email Configuration */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <span className="text-2xl">📧</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Email Configuration</h3>
                  <p className="text-sm text-gray-600">Configure SMTP and email templates</p>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/email-config"
                  className="block w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                >
                  Email Settings
                </Link>
              </div>
            </div>

            {/* Role Management */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 p-3 rounded-lg mr-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Role Management</h3>
                  <p className="text-sm text-gray-600">Manage user roles and permissions</p>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/roles"
                  className="block w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                >
                  View Roles
                </Link>
              </div>
            </div>

            {/* System Settings */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 p-3 rounded-lg mr-4">
                  <span className="text-2xl">⚙️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">System Settings</h3>
                  <p className="text-sm text-gray-600">Configure system-wide settings</p>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/settings"
                  className="block w-full text-left px-4 py-2 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors"
                >
                  System Configuration
                </Link>
              </div>
            </div>

            {/* Audit & Logging */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-3 rounded-lg mr-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Audit & Logging</h3>
                  <p className="text-sm text-gray-600">View security logs and audit trails</p>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/audit"
                  className="block w-full text-left px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                >
                  Security Logs
                </Link>
              </div>
            </div>

            {/* Administrative Reports */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-3 rounded-lg mr-4">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Administrative Reports</h3>
                  <p className="text-sm text-gray-600">Generate system and user reports</p>
                </div>
              </div>
              <div className="space-y-2">
                <Link
                  href="/admin/reports"
                  className="block w-full text-left px-4 py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
                >
                  View Reports
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Total Users</h3>
              <p className="text-2xl font-bold text-blue-700">{users.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Active Users</h3>
              <p className="text-2xl font-bold text-green-700">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900">Admins</h3>
              <p className="text-2xl font-bold text-purple-700">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Last Login</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-2">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                        user.role === 'OVERSEER' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className={`px-3 py-1 rounded text-xs ${
                            user.isActive 
                              ? 'bg-red-500 text-white hover:bg-red-600' 
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => resendInvitation(user.id, user.email)}
                          className="px-3 py-1 rounded text-xs bg-blue-500 text-white hover:bg-blue-600"
                        >
                          Resend Invite
                        </button>
                        <Link
                          href={`/admin/users/${user.id}/edit`}
                          className="px-3 py-1 rounded text-xs bg-gray-500 text-white hover:bg-gray-600"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <ErrorBoundary>
      <AdminDashboardContent />
    </ErrorBoundary>
  )
}
