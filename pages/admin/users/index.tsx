import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { prisma } from '../../../src/lib/prisma'
import { format, parseISO } from 'date-fns'
import { notifyAlert, toast } from '../../../lib/ui/toast'
import { appConfirm, appConfirmMessage } from '../../../lib/ui/confirm'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  inviteToken: string | null
  passwordHash: string | null
  createdAt: string
  volunteer?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface UsersPageProps {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  initialSearch: string
  initialRoleFilter: string
}

export default function UsersPage({ users: initialUsers, pagination: initialPagination, initialSearch, initialRoleFilter }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(initialSearch)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState(initialRoleFilter)
  const [pagination, setPagination] = useState(initialPagination)

  // Update state when props change (e.g., pagination navigation)
  useEffect(() => {
    setUsers(initialUsers)
    setPagination(initialPagination)
    setSearch(initialSearch)
    setRoleFilter(initialRoleFilter)
  }, [initialUsers, initialPagination, initialSearch, initialRoleFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Redirect to same page with search parameters
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (roleFilter) params.append('role', roleFilter)
    params.append('page', '1')
    
    window.location.href = `/admin/users?${params.toString()}`
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      })

      const data = await response.json()

      if (data.success) {
        window.location.reload() // Refresh the page
      } else {
        setError(data.error || 'Failed to update user status')
      }
    } catch (err) {
      setError('Error updating user status')
      console.error('Error updating user:', err)
    }
  }

  const resendInvitation = async (userId: string, email: string) => {
    if (!(await appConfirmMessage(`Resend invitation to ${email}?`))) return
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/resend-invitation`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        notifyAlert('✅ Invitation resent successfully!')
        window.location.reload()
      } else {
        setError(data.error || 'Failed to resend invitation')
      }
    } catch (err) {
      setError('Error resending invitation')
      console.error('Error:', err)
    }
  }

  const cancelInvitation = async (userId: string, email: string) => {
    if (!(await appConfirmMessage(`Cancel invitation for ${email}? This will delete the user account.`))) return
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        notifyAlert('✅ Invitation cancelled successfully!')
        window.location.reload()
      } else {
        setError(data.error || 'Failed to cancel invitation')
      }
    } catch (err) {
      setError('Error cancelling invitation')
      console.error('Error:', err)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'OVERSEER':
        return 'bg-purple-100 text-purple-800'
      case 'ASSISTANT_OVERSEER':
        return 'bg-blue-100 text-blue-800'
      case 'KEYMAN':
        return 'bg-yellow-100 text-yellow-800'
      case 'SUPPORT':
        return 'bg-teal-100 text-teal-800'
      case 'VOLUNTEER':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <AdminLayout 
      title="User Management" 
      breadcrumbs={[{ label: 'User Management' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-6">
          <Link
            href="/admin/users/invite"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium text-center min-h-[44px] touch-manipulation"
          >
            📧 Invite Users
          </Link>
          <Link
            href="/admin/users/bulk"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg text-sm font-medium text-center min-h-[44px] touch-manipulation"
          >
            Bulk Operations
          </Link>
        </div>

        {/* Search and Filter */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="OVERSEER">Overseer</option>
              <option value="ASSISTANT_OVERSEER">Assistant Overseer</option>
              <option value="KEYMAN">Keyman</option>
              <option value="SUPPORT">Support</option>
              <option value="VOLUNTEER">Volunteer</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors min-h-[44px] touch-manipulation"
          >
            🔍 Search
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <div className="text-gray-500">No users found</div>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-200">
                {users.map((user) => {
                  const invited = Boolean(user.inviteToken && !user.passwordHash)
                  const statusLabel = invited ? 'Invited' : user.isActive ? 'Active' : 'Inactive'
                  const statusClass = invited
                    ? 'bg-yellow-100 text-yellow-800'
                    : user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  return (
                    <div key={user.id} className="p-4 space-y-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 break-words">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-600 break-all">{user.email}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 break-words">
                        {user.volunteer ? (
                          <span className="text-green-700">
                            Linked: {user.volunteer.firstName} {user.volunteer.lastName}
                          </span>
                        ) : (
                          <span className="text-gray-500">No volunteer linked</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created {format(parseISO(user.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <Link
                          href={`/admin/users/${user.id}/edit`}
                          className="text-center px-3 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-800 min-h-[44px] touch-manipulation"
                        >
                          Edit User
                        </Link>
                        {invited && (
                          <>
                            <button
                              type="button"
                              onClick={() => resendInvitation(user.id, user.email)}
                              className="px-3 py-3 rounded-md text-sm font-medium text-blue-800 bg-blue-50 min-h-[44px] touch-manipulation"
                            >
                              Resend Invitation
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelInvitation(user.id, user.email)}
                              className="px-3 py-3 rounded-md text-sm font-medium text-red-800 bg-red-50 min-h-[44px] touch-manipulation"
                            >
                              Cancel Invitation
                            </button>
                          </>
                        )}
                        {!invited && (
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                            className={`px-3 py-3 rounded-md text-sm font-medium min-h-[44px] touch-manipulation ${
                              user.isActive ? 'text-red-800 bg-red-50' : 'text-green-800 bg-green-50'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Linked Volunteer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" style={{ overflow: 'visible' }}>
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.inviteToken && !user.passwordHash
                              ? 'bg-yellow-100 text-yellow-800'
                              : user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.inviteToken && !user.passwordHash ? 'Invited' : user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.volunteer ? (
                            <span className="text-green-600">
                              ✅ {user.volunteer.firstName} {user.volunteer.lastName}
                            </span>
                          ) : (
                            <span className="text-gray-400">No volunteer linked</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(parseISO(user.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                setOpenDropdown(openDropdown === user.id ? null : user.id)
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Actions
                              <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {openDropdown === user.id && (
                              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5" style={{ zIndex: 9999 }}>
                                <div className="py-1" role="menu">
                                  <Link
                                    href={`/admin/users/${user.id}/edit`}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    ✏️ Edit User
                                  </Link>
                                  
                                  {user.inviteToken && !user.passwordHash && (
                                    <>
                                      <button
                                        onClick={() => { resendInvitation(user.id, user.email); setOpenDropdown(null); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                      >
                                        📧 Resend Invitation
                                      </button>
                                      <button
                                        onClick={() => { cancelInvitation(user.id, user.email); setOpenDropdown(null); }}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                      >
                                        ❌ Cancel Invitation
                                      </button>
                                    </>
                                  )}
                                  
                                  {(!user.inviteToken || user.passwordHash) && (
                                    <button
                                      onClick={() => { toggleUserStatus(user.id, user.isActive); setOpenDropdown(null); }}
                                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                        user.isActive ? 'text-red-700' : 'text-green-700'
                                      }`}
                                    >
                                      {user.isActive ? '🚫 Deactivate' : '✅ Activate'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </div>
                    <div className="flex space-x-2">
                      {pagination.page <= 1 ? (
                        <span className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-400 cursor-not-allowed">
                          Previous
                        </span>
                      ) : (
                        <Link
                          href={`/admin/users?${new URLSearchParams({
                            page: String(pagination.page - 1),
                            ...(search && { search }),
                            ...(roleFilter && { role: roleFilter })
                          }).toString()}`}
                          className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          Previous
                        </Link>
                      )}
                      <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                        {pagination.page} of {pagination.pages}
                      </span>
                      {pagination.page >= pagination.pages ? (
                        <span className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-400 cursor-not-allowed">
                          Next
                        </span>
                      ) : (
                        <Link
                          href={`/admin/users?${new URLSearchParams({
                            page: String(pagination.page + 1),
                            ...(search && { search }),
                            ...(roleFilter && { role: roleFilter })
                          }).toString()}`}
                          className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          Next
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/users/new"
              className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl">➕</span>
              <span className="text-sm font-medium text-gray-900">Create User</span>
            </Link>
            <Link
              href="/admin/users/bulk"
              className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <span className="text-2xl">📨</span>
              <span className="text-sm font-medium text-gray-900">Bulk Actions</span>
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-medium text-gray-900">Refresh</span>
            </button>
            <Link
              href="/admin/audit-logs"
              className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <span className="text-2xl">📋</span>
              <span className="text-sm font-medium text-gray-900">View Logs</span>
            </Link>
          </div>
        </div>
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

  // Get query parameters
  const { page = '1', limit = '10', search = '', role = '' } = context.query
  
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)
  const skip = (pageNum - 1) * limitNum

  const where: any = {}
  
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } }
    ]
  }
  
  if (role) {
    where.role = role
  }

  try {
    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          volunteer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.users.count({ where })
    ])

    const pages = Math.ceil(total / limitNum)

    // Transform dates for JSON serialization
    const serializedUsers = users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }))

    return {
      props: {
        users: serializedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages
        },
        initialSearch: search as string,
        initialRoleFilter: role as string
      }
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return {
      props: {
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        },
        initialSearch: '',
        initialRoleFilter: ''
      }
    }
  }
}
