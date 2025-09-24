import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useEffect, useState } from 'react'

interface ApiEndpoint {
  name: string
  url: string
  method: string
  status: 'healthy' | 'warning' | 'error'
  responseTime: number
  lastChecked: string
  description: string
}

export default function ApiStatusPage() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchApiStatus()
    const interval = setInterval(fetchApiStatus, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const fetchApiStatus = async () => {
    try {
      setError('')
      const response = await fetch('/api/admin/api-status')
      const data = await response.json()

      if (data.success) {
        setEndpoints(data.data.endpoints)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch API status')
      }
    } catch (err) {
      setError('Error loading API status')
      console.error('Error fetching API status:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      default:
        return '❓'
    }
  }

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-100 text-blue-800'
      case 'POST':
        return 'bg-green-100 text-green-800'
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Mock data for demonstration
  const mockEndpoints: ApiEndpoint[] = [
    {
      name: 'Authentication',
      url: '/api/auth/session',
      method: 'GET',
      status: 'healthy',
      responseTime: 45,
      lastChecked: new Date().toISOString(),
      description: 'NextAuth session endpoint'
    },
    {
      name: 'User Management',
      url: '/api/admin/users',
      method: 'GET',
      status: 'healthy',
      responseTime: 120,
      lastChecked: new Date().toISOString(),
      description: 'User CRUD operations'
    },
    {
      name: 'Health Check',
      url: '/api/admin/health',
      method: 'GET',
      status: 'warning',
      responseTime: 250,
      lastChecked: new Date().toISOString(),
      description: 'System health monitoring'
    },
    {
      name: 'Database Connection',
      url: '/api/admin/database',
      method: 'GET',
      status: 'healthy',
      responseTime: 85,
      lastChecked: new Date().toISOString(),
      description: 'Database connectivity test'
    },
    {
      name: 'Email Service',
      url: '/api/admin/email/test',
      method: 'POST',
      status: 'error',
      responseTime: 0,
      lastChecked: new Date().toISOString(),
      description: 'SMTP email service test'
    }
  ]

  const displayEndpoints = endpoints.length > 0 ? endpoints : mockEndpoints

  return (
    <AdminLayout 
      title="API Status Monitor" 
      breadcrumbs={[{ label: 'API Status' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Monitor API endpoints and service health</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchApiStatus}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Overall Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {displayEndpoints.filter(e => e.status === 'healthy').length}
                </p>
                <p className="text-sm text-gray-600">Healthy</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {displayEndpoints.filter(e => e.status === 'warning').length}
                </p>
                <p className="text-sm text-gray-600">Warning</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {displayEndpoints.filter(e => e.status === 'error').length}
                </p>
                <p className="text-sm text-gray-600">Error</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{displayEndpoints.length}</p>
                <p className="text-sm text-gray-600">Total APIs</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading API status...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Checked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayEndpoints.map((endpoint, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {endpoint.name}
                          </div>
                          <div className="text-sm text-gray-500">{endpoint.url}</div>
                          <div className="text-xs text-gray-400">{endpoint.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full border ${getStatusColor(endpoint.status)}`}>
                          <span className="text-sm font-medium">
                            {getStatusIcon(endpoint.status)} {endpoint.status.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {endpoint.responseTime > 0 ? `${endpoint.responseTime}ms` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(endpoint.lastChecked).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => window.open(endpoint.url, '_blank')}
                          className="text-blue-600 hover:text-blue-900 transition-colors mr-3"
                        >
                          🔗 Test
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 transition-colors">
                          📋 Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={fetchApiStatus}
              className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-medium text-gray-900">Refresh All</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors">
              <span className="text-2xl">🧪</span>
              <span className="text-sm font-medium text-gray-900">Run Tests</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <span className="text-2xl">📊</span>
              <span className="text-sm font-medium text-gray-900">View Metrics</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 rounded-lg border border-gray-200 hover:border-gray-500 hover:bg-gray-50 transition-colors">
              <span className="text-2xl">⚙️</span>
              <span className="text-sm font-medium text-gray-900">Configure</span>
            </button>
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

  return {
    props: {},
  }
}
