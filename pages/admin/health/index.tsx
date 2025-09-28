import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import AdminLayout from '../../../components/AdminLayout'
import { useEffect, useState } from 'react'

interface HealthMetrics {
  database: {
    status: 'healthy' | 'warning' | 'error'
    responseTime: number
    connections: number
  }
  server: {
    status: 'healthy' | 'warning' | 'error'
    uptime: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: number
  }
  services: {
    nextAuth: 'healthy' | 'warning' | 'error'
    prisma: 'healthy' | 'warning' | 'error'
    email: 'healthy' | 'warning' | 'error'
  }
}

export default function HealthMonitorPage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchHealthMetrics()
    const interval = setInterval(fetchHealthMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchHealthMetrics = async () => {
    try {
      setError('')
      const response = await fetch('/api/admin/health')
      const data = await response.json()

      if (data.success) {
        setMetrics(data.data)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch health metrics')
      }
    } catch (err) {
      setError('Error loading health metrics')
      console.error('Error fetching health metrics:', err)
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

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <AdminLayout 
      title="Health Monitor" 
      breadcrumbs={[{ label: 'Health Monitor' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Monitor system health and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchHealthMetrics}
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

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading health metrics...</div>
          </div>
        ) : metrics ? (
          <>
            {/* Overall Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Database</h3>
                    <p className="text-sm text-gray-600">PostgreSQL Connection</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full border ${getStatusColor(metrics.database.status)}`}>
                    <span className="text-sm font-medium">
                      {getStatusIcon(metrics.database.status)} {metrics.database.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Response Time:</span>
                    <span className="font-medium">{metrics.database.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Connections:</span>
                    <span className="font-medium">{metrics.database.connections}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Server</h3>
                    <p className="text-sm text-gray-600">Application Server</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full border ${getStatusColor(metrics.server.status)}`}>
                    <span className="text-sm font-medium">
                      {getStatusIcon(metrics.server.status)} {metrics.server.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uptime:</span>
                    <span className="font-medium">{formatUptime(metrics.server.uptime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CPU Usage:</span>
                    <span className="font-medium">{metrics.server.cpu.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Memory</h3>
                    <p className="text-sm text-gray-600">System Memory Usage</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {metrics.server.memory.percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatBytes(metrics.server.memory.used)} / {formatBytes(metrics.server.memory.total)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metrics.server.memory.percentage > 90 ? 'bg-red-500' :
                        metrics.server.memory.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${metrics.server.memory.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Services Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🔐</span>
                    <div>
                      <div className="font-medium text-gray-900">NextAuth.js</div>
                      <div className="text-sm text-gray-600">Authentication Service</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.services.nextAuth)}`}>
                    {getStatusIcon(metrics.services.nextAuth)} {metrics.services.nextAuth.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🗄️</span>
                    <div>
                      <div className="font-medium text-gray-900">Prisma ORM</div>
                      <div className="text-sm text-gray-600">Database Client</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.services.prisma)}`}>
                    {getStatusIcon(metrics.services.prisma)} {metrics.services.prisma.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📧</span>
                    <div>
                      <div className="font-medium text-gray-900">Email Service</div>
                      <div className="text-sm text-gray-600">SMTP Configuration</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.services.email)}`}>
                    {getStatusIcon(metrics.services.email)} {metrics.services.email.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Node.js Version</div>
                  <div className="font-medium">{process.version}</div>
                </div>
                <div>
                  <div className="text-gray-600">Next.js Version</div>
                  <div className="font-medium">14.2.33</div>
                </div>
                <div>
                  <div className="text-gray-600">Environment</div>
                  <div className="font-medium">Staging</div>
                </div>
                <div>
                  <div className="text-gray-600">Platform</div>
                  <div className="font-medium">{process.platform}</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💚</div>
            <div className="text-gray-500">No health data available</div>
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
    props: {},
  }
}
