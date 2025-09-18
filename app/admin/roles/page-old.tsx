'use client'

import { useAuth } from '../../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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

interface RoleStats {
  role: string
  count: number
  activeCount: number
  users: User[]
}

export default function RoleManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [roleStats, setRoleStats] = useState<RoleStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const roleHierarchy = [
    {
      role: 'ADMIN',
      name: 'Administrator',
      description: 'Full system access, user management, system configuration',
      color: 'bg-red-100 text-red-800 border-red-200',
      level: 5,
      permissions: [
        'Manage all users and roles',
        'Configure system settings',
        'Access all modules',
        'View audit logs',
        'Manage email configuration'
      ]
    },
    {
      role: 'OVERSEER',
      name: 'Overseer',
      description: 'Department oversight, assignment management, event coordination',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      level: 4,
      permissions: [
        'Manage events and assignments',
        'View department reports',
        'Assign attendants to positions',
        'Access oversight tools'
      ]
    },
    {
      role: 'ASSISTANT_OVERSEER',
      name: 'Assistant Overseer',
      description: 'Limited oversight capabilities, assist with assignments',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      level: 3,
      permissions: [
        'Assist with event management',
        'View assignment reports',
        'Help coordinate attendants'
      ]
    },
    {
      role: 'KEYMAN',
      name: 'Keyman',
      description: 'Key position assignments, special access areas',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      level: 2,
      permissions: [
        'Access key positions',
        'Manage special assignments',
        'View position-specific data'
      ]
    },
    {
      role: 'ATTENDANT',
      name: 'Attendant',
      description: 'Standard user, view personal assignments and availability',
      color: 'bg-green-100 text-green-800 border-green-200',
      level: 1,
      permissions: [
        'View personal assignments',
        'Update availability',
        'Access basic profile'
      ]
    }
  ]

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
        calculateRoleStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateRoleStats = (userData: User[]) => {
    const stats: { [key: string]: RoleStats } = {}
    
    // Initialize all roles
    roleHierarchy.forEach(role => {
      stats[role.role] = {
        role: role.role,
        count: 0,
        activeCount: 0,
        users: []
      }
    })

    // Count users by role
    userData.forEach(user => {
      if (stats[user.role]) {
        stats[user.role].count++
        stats[user.role].users.push(user)
        if (user.isActive) {
          stats[user.role].activeCount++
        }
      }
    })

    setRoleStats(Object.values(stats))
  }

  const bulkChangeRole = async (fromRole: string, toRole: string) => {
    if (!confirm(`Change all ${fromRole} users to ${toRole}? This action cannot be undone.`)) {
      return
    }

    try {
      const userIds = roleStats.find(r => r.role === fromRole)?.users.map(u => u.id) || []
      
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'change_role',
          userIds,
          data: { role: toRole }
        }),
      })

      if (response.ok) {
        alert(`Successfully changed ${userIds.length} users from ${fromRole} to ${toRole}`)
        fetchUsers()
      } else {
        alert('Failed to change user roles')
      }
    } catch (error) {
      console.error('Failed to change roles:', error)
      alert('Failed to change user roles')
    }
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
            <h1 className="text-3xl font-bold">Role Management</h1>
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Admin
            </Link>
          </div>

          {/* Role Hierarchy */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Role Hierarchy & Permissions</h2>
            <div className="space-y-4">
              {roleHierarchy.map((role) => {
                const stats = roleStats.find(s => s.role === role.role)
                return (
                  <div
                    key={role.role}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedRole === role.role 
                        ? 'ring-2 ring-blue-500 ' + role.color
                        : role.color
                    }`}
                    onClick={() => setSelectedRole(selectedRole === role.role ? null : role.role)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-2xl font-bold">Level {role.level}</span>
                          <h3 className="text-lg font-semibold">{role.name}</h3>
                          <span className="px-2 py-1 rounded text-xs bg-white bg-opacity-50">
                            {stats?.activeCount || 0} active / {stats?.count || 0} total
                          </span>
                        </div>
                        <p className="text-sm mb-3">{role.description}</p>
                        
                        {selectedRole === role.role && (
                          <div className="mt-4 space-y-3">
                            <div>
                              <h4 className="font-semibold mb-2">Permissions:</h4>
                              <ul className="text-sm space-y-1">
                                {role.permissions.map((permission, index) => (
                                  <li key={index} className="flex items-center">
                                    <span className="text-green-600 mr-2">✓</span>
                                    {permission}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {stats && stats.users.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Users with this role:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {stats.users.map(user => (
                                    <div key={user.id} className="text-sm bg-white bg-opacity-50 p-2 rounded">
                                      <span className="font-medium">{user.firstName} {user.lastName}</span>
                                      <span className={`ml-2 px-1 rounded text-xs ${
                                        user.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                      }`}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold">{stats?.count || 0}</div>
                        <div className="text-xs">users</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Role Statistics */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Role Distribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {roleHierarchy.map((role) => {
                const stats = roleStats.find(s => s.role === role.role)
                const percentage = users.length > 0 ? ((stats?.count || 0) / users.length * 100).toFixed(1) : '0'
                
                return (
                  <div key={role.role} className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-800">{stats?.count || 0}</div>
                    <div className="text-sm text-gray-600">{role.name}</div>
                    <div className="text-xs text-gray-500">{percentage}% of users</div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bulk Role Operations */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Bulk Role Operations</h3>
            <p className="text-yellow-700 text-sm mb-4">
              Use these operations carefully. They will change roles for multiple users at once.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">From Role:</label>
                <select className="w-full px-3 py-2 border border-yellow-300 rounded-md text-sm">
                  <option value="">Select source role...</option>
                  {roleHierarchy.map(role => (
                    <option key={role.role} value={role.role}>
                      {role.name} ({roleStats.find(s => s.role === role.role)?.count || 0} users)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-800 mb-1">To Role:</label>
                <select className="w-full px-3 py-2 border border-yellow-300 rounded-md text-sm">
                  <option value="">Select target role...</option>
                  {roleHierarchy.map(role => (
                    <option key={role.role} value={role.role}>{role.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
                disabled
              >
                Execute Bulk Role Change (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
