import { getServerSession } from 'next-auth/next'
import { authConfig } from '../../../auth.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  isSystem: boolean
}

export default async function RolesPage() {
  // Server-side authentication check
  const session = await getServerSession(authConfig)

  if (!session || !session.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Mock roles data
  const roles: Role[] = [
    {
      id: '1',
      name: 'ADMIN',
      description: 'Full system administrator with all permissions',
      permissions: ['ALL'],
      userCount: 1,
      isSystem: true
    },
    {
      id: '2',
      name: 'OVERSEER',
      description: 'Congregation overseer with management permissions',
      permissions: ['MANAGE_ATTENDANTS', 'VIEW_REPORTS', 'MANAGE_EVENTS'],
      userCount: 3,
      isSystem: true
    },
    {
      id: '3',
      name: 'ATTENDANT',
      description: 'Regular attendant with basic permissions',
      permissions: ['VIEW_SCHEDULE', 'UPDATE_PROFILE'],
      userCount: 25,
      isSystem: true
    },
    {
      id: '4',
      name: 'VIEWER',
      description: 'Read-only access to schedules and events',
      permissions: ['VIEW_SCHEDULE'],
      userCount: 12,
      isSystem: false
    }
  ]

  const getPermissionColor = (permission: string) => {
    if (permission === 'ALL') return 'bg-red-100 text-red-800'
    if (permission.startsWith('MANAGE')) return 'bg-blue-100 text-blue-800'
    if (permission.startsWith('VIEW')) return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Configure roles and access levels
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Back to Admin
                </Link>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Create Role
                </button>
              </div>
            </div>

            {/* Role Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{roles.length}</div>
                <div className="text-sm text-blue-700">Total Roles</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {roles.filter(r => r.isSystem).length}
                </div>
                <div className="text-sm text-green-700">System Roles</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">
                  {roles.filter(r => !r.isSystem).length}
                </div>
                <div className="text-sm text-purple-700">Custom Roles</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">
                  {roles.reduce((sum, r) => sum + r.userCount, 0)}
                </div>
                <div className="text-sm text-yellow-700">Total Users</div>
              </div>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roles.map((role) => (
                <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        {role.name}
                        {role.isSystem && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            System
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">{role.description}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions:</h4>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission, index) => (
                        <span
                          key={index}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionColor(permission)}`}
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-500">
                      {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                      Edit
                    </button>
                    {!role.isSystem && (
                      <button className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Permission Matrix */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Permission Matrix</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin Panel
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manage Users
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Manage Events
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        View Reports
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        View Schedule
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {role.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {(role.permissions.includes('ALL') || role.name === 'ADMIN') ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-300">✗</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {(role.permissions.includes('ALL') || role.permissions.includes('MANAGE_USERS')) ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-300">✗</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {(role.permissions.includes('ALL') || role.permissions.includes('MANAGE_EVENTS')) ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-300">✗</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {(role.permissions.includes('ALL') || role.permissions.includes('VIEW_REPORTS')) ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-300">✗</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {(role.permissions.includes('ALL') || role.permissions.includes('VIEW_SCHEDULE')) ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-300">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
