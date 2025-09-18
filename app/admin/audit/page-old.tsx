import { getServerSession } from 'next-auth/next'
import { authConfig } from '../../../auth.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuditLog {
  id: string
  userId: string
  userEmail: string
  userName: string
  action: string
  resource: string
  resourceId: string
  details: string
  ipAddress: string
  userAgent: string
  timestamp: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export default async function AuditLogsPage() {
  // Server-side authentication check
  const session = await getServerSession(authConfig)

  if (!session || !session.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Fetch audit logs server-side (mock data for now)
  const logs: AuditLog[] = [
    {
      id: '1',
      userId: session.user.id || '',
      userEmail: session.user.email || '',
      userName: session.user.name || '',
      action: 'LOGIN',
      resource: 'AUTH',
      resourceId: 'session',
      details: 'User logged in successfully',
      ipAddress: '10.92.3.24',
      userAgent: 'NextAuth/Server',
      timestamp: new Date().toISOString(),
      severity: 'LOW'
    }
  ]
    dateFrom: '',
    dateTo: '',
    userId: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Mock data for demonstration
  const mockLogs: AuditLog[] = [
    {
      id: '1',
      userId: 'admin-1',
      userEmail: 'admin@congregation.org',
      userName: 'System Admin',
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: 'user-123',
      details: 'Created new user: John Smith (john.smith@email.com) with role ATTENDANT',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      severity: 'MEDIUM'
    },
    {
      id: '2',
      userId: 'admin-1',
      userEmail: 'admin@congregation.org',
      userName: 'System Admin',
      action: 'BULK_USER_IMPORT',
      resource: 'User',
      resourceId: 'import-session-456',
      details: 'Imported 25 users via CSV upload',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      severity: 'HIGH'
    },
    {
      id: '3',
      userId: 'overseer-1',
      userEmail: 'overseer@congregation.org',
      userName: 'John Overseer',
      action: 'LOGIN_SUCCESS',
      resource: 'Authentication',
      resourceId: 'session-789',
      details: 'Successful login from new device',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
      severity: 'LOW'
    },
    {
      id: '4',
      userId: 'admin-1',
      userEmail: 'admin@congregation.org',
      userName: 'System Admin',
      action: 'EMAIL_CONFIG_UPDATED',
      resource: 'EmailConfiguration',
      resourceId: 'config-1',
      details: 'Updated SMTP configuration settings',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      severity: 'MEDIUM'
    },
    {
      id: '5',
      userId: 'unknown',
      userEmail: 'unknown@attacker.com',
      userName: 'Unknown User',
      action: 'LOGIN_FAILED',
      resource: 'Authentication',
      resourceId: 'failed-attempt-999',
      details: 'Failed login attempt with invalid credentials (5th attempt)',
      ipAddress: '203.0.113.45',
      userAgent: 'curl/7.68.0',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
      severity: 'CRITICAL'
    }
  ]

  useEffect(() => {
    if (authLoading) return
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }

    // TODO: Fetch actual audit logs from API
    setLogs(mockLogs)
    setTotalPages(1)
    setLoading(false)
  }, [user, authLoading, router])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'USER_CREATED': return '👤➕'
      case 'USER_UPDATED': return '👤✏️'
      case 'USER_DELETED': return '👤❌'
      case 'BULK_USER_IMPORT': return '📥👥'
      case 'LOGIN_SUCCESS': return '🔓✅'
      case 'LOGIN_FAILED': return '🔒❌'
      case 'EMAIL_CONFIG_UPDATED': return '📧⚙️'
      case 'ROLE_CHANGED': return '🔄👤'
      case 'SYSTEM_SETTINGS_UPDATED': return '⚙️✏️'
      default: return '📝'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins} minutes ago`
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
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
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Audit & Security Logs</h1>
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Admin
            </Link>
          </div>

          {/* Security Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-sm font-semibold text-red-800">Critical Events</h3>
              <p className="text-2xl font-bold text-red-700">
                {logs.filter(log => log.severity === 'CRITICAL').length}
              </p>
              <p className="text-xs text-red-600">Last 24 hours</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="text-sm font-semibold text-orange-800">Failed Logins</h3>
              <p className="text-2xl font-bold text-orange-700">
                {logs.filter(log => log.action === 'LOGIN_FAILED').length}
              </p>
              <p className="text-xs text-orange-600">Last 24 hours</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800">User Actions</h3>
              <p className="text-2xl font-bold text-blue-700">
                {logs.filter(log => log.action.includes('USER_')).length}
              </p>
              <p className="text-xs text-blue-600">Last 24 hours</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-sm font-semibold text-green-800">Total Events</h3>
              <p className="text-2xl font-bold text-green-700">{logs.length}</p>
              <p className="text-xs text-green-600">Last 24 hours</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                <select 
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                >
                  <option value="">All Actions</option>
                  <option value="USER_CREATED">User Created</option>
                  <option value="LOGIN_FAILED">Login Failed</option>
                  <option value="EMAIL_CONFIG_UPDATED">Email Config</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                <select 
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={filters.severity}
                  onChange={(e) => setFilters({...filters, severity: e.target.value})}
                >
                  <option value="">All Levels</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                <input 
                  type="date" 
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                <input 
                  type="date" 
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                <input 
                  type="text" 
                  placeholder="User, IP, details..."
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
              <div className="flex items-end">
                <button className="w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatTimestamp(log.timestamp)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">{log.userName}</div>
                      <div className="text-xs text-gray-500">{log.userEmail}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <span className="mr-2">{getActionIcon(log.action)}</span>
                        <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-xs text-gray-500">{log.resource}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {log.ipAddress}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {logs.length} entries
            </div>
            <div className="flex space-x-2">
              <button
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                {currentPage}
              </span>
              <button
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Audit logs are retained for 90 days and automatically archived.
              </div>
              <div className="space-x-2">
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 px-4 py-2 rounded text-sm cursor-not-allowed"
                >
                  Export CSV (Coming Soon)
                </button>
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 px-4 py-2 rounded text-sm cursor-not-allowed"
                >
                  Generate Report (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
