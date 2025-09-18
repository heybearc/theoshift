import { getServerSession } from 'next-auth/next'
import { authConfig } from '../../../auth.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  // Fetch audit logs server-side (mock data for demonstration)
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
    },
    {
      id: '2',
      userId: session.user.id || '',
      userEmail: session.user.email || '',
      userName: session.user.name || '',
      action: 'VIEW_ADMIN',
      resource: 'ADMIN_PANEL',
      resourceId: 'audit',
      details: 'Accessed audit logs page',
      ipAddress: '10.92.3.24',
      userAgent: 'NextAuth/Server',
      timestamp: new Date().toISOString(),
      severity: 'MEDIUM'
    }
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Audit & Logging</h1>
                <p className="mt-2 text-sm text-gray-600">
                  View system audit logs and user activity
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Admin
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{logs.length}</div>
                <div className="text-sm text-blue-700">Total Logs</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {logs.filter(l => l.severity === 'LOW').length}
                </div>
                <div className="text-sm text-green-700">Low Severity</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">
                  {logs.filter(l => l.severity === 'MEDIUM').length}
                </div>
                <div className="text-sm text-yellow-700">Medium Severity</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-900">
                  {logs.filter(l => ['HIGH', 'CRITICAL'].includes(l.severity)).length}
                </div>
                <div className="text-sm text-red-700">High/Critical</div>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                        <div className="text-sm text-gray-500">{log.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {logs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No audit logs found</div>
                <p className="text-gray-400 mt-2">Audit logs will appear here as users interact with the system</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
