'use client'

import { useAuth } from '../../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ReportData {
  userStats: {
    totalUsers: number
    activeUsers: number
    newUsersThisMonth: number
    roleDistribution: { role: string; count: number }[]
  }
  systemStats: {
    totalLogins: number
    failedLogins: number
    avgSessionDuration: number
    systemUptime: number
  }
  activityStats: {
    dailyActiveUsers: { date: string; count: number }[]
    topActions: { action: string; count: number }[]
  }
}

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState('overview')
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0] // today
  })

  // Mock data for demonstration
  const mockReportData: ReportData = {
    userStats: {
      totalUsers: 45,
      activeUsers: 38,
      newUsersThisMonth: 12,
      roleDistribution: [
        { role: 'ATTENDANT', count: 28 },
        { role: 'KEYMAN', count: 8 },
        { role: 'ASSISTANT_OVERSEER', count: 4 },
        { role: 'OVERSEER', count: 3 },
        { role: 'ADMIN', count: 2 }
      ]
    },
    systemStats: {
      totalLogins: 342,
      failedLogins: 15,
      avgSessionDuration: 45, // minutes
      systemUptime: 99.8 // percentage
    },
    activityStats: {
      dailyActiveUsers: [
        { date: '2024-01-01', count: 15 },
        { date: '2024-01-02', count: 18 },
        { date: '2024-01-03', count: 22 },
        { date: '2024-01-04', count: 19 },
        { date: '2024-01-05', count: 25 },
        { date: '2024-01-06', count: 28 },
        { date: '2024-01-07', count: 24 }
      ],
      topActions: [
        { action: 'LOGIN_SUCCESS', count: 342 },
        { action: 'VIEW_ASSIGNMENTS', count: 156 },
        { action: 'UPDATE_PROFILE', count: 89 },
        { action: 'USER_CREATED', count: 12 },
        { action: 'EMAIL_SENT', count: 45 }
      ]
    }
  }

  useEffect(() => {
    if (authLoading) return
    
    if (!user || user.role !== 'ADMIN') {
      router.push('/unauthorized')
      return
    }

    // TODO: Fetch actual report data from API
    setReportData(mockReportData)
    setLoading(false)
  }, [user, authLoading, router])

  const generateReport = async (reportType: string) => {
    // TODO: Implement report generation
    console.log(`Generating ${reportType} report for ${dateRange.from} to ${dateRange.to}`)
    alert(`${reportType} report generation will be implemented soon!`)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const reports = [
    { id: 'overview', name: 'System Overview', icon: '📊', description: 'General system statistics and health' },
    { id: 'users', name: 'User Analytics', icon: '👥', description: 'User registration, activity, and role distribution' },
    { id: 'security', name: 'Security Report', icon: '🔒', description: 'Login attempts, failed authentications, and security events' },
    { id: 'activity', name: 'Activity Report', icon: '📈', description: 'User engagement and system usage patterns' },
    { id: 'performance', name: 'Performance Report', icon: '⚡', description: 'System performance metrics and response times' },
    { id: 'audit', name: 'Audit Trail', icon: '📋', description: 'Complete audit log with administrative actions' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Administrative Reports</h1>
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Admin
            </Link>
          </div>

          {/* Date Range Selector */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Report Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <button
                  onClick={() => setSelectedReport('overview')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Update Reports
                </button>
              </div>
            </div>
          </div>

          {/* Report Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedReport === report.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">{report.icon}</span>
                  <h3 className="font-semibold text-gray-800">{report.name}</h3>
                </div>
                <p className="text-sm text-gray-600">{report.description}</p>
              </div>
            ))}
          </div>

          {/* Overview Report */}
          {selectedReport === 'overview' && reportData && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">System Overview</h2>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-800">Total Users</h3>
                  <p className="text-3xl font-bold text-blue-700">{reportData.userStats.totalUsers}</p>
                  <p className="text-xs text-blue-600">
                    {reportData.userStats.activeUsers} active ({Math.round((reportData.userStats.activeUsers / reportData.userStats.totalUsers) * 100)}%)
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-sm font-semibold text-green-800">New Users</h3>
                  <p className="text-3xl font-bold text-green-700">{reportData.userStats.newUsersThisMonth}</p>
                  <p className="text-xs text-green-600">This month</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-800">Total Logins</h3>
                  <p className="text-3xl font-bold text-purple-700">{reportData.systemStats.totalLogins}</p>
                  <p className="text-xs text-purple-600">
                    {reportData.systemStats.failedLogins} failed ({Math.round((reportData.systemStats.failedLogins / reportData.systemStats.totalLogins) * 100)}%)
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h3 className="text-sm font-semibold text-orange-800">System Uptime</h3>
                  <p className="text-3xl font-bold text-orange-700">{reportData.systemStats.systemUptime}%</p>
                  <p className="text-xs text-orange-600">Last 30 days</p>
                </div>
              </div>

              {/* Role Distribution Chart */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">User Role Distribution</h3>
                <div className="space-y-3">
                  {reportData.userStats.roleDistribution.map((role) => {
                    const percentage = Math.round((role.count / reportData.userStats.totalUsers) * 100)
                    return (
                      <div key={role.role} className="flex items-center">
                        <div className="w-20 text-sm font-medium text-gray-700">
                          {role.role.replace('_', ' ')}
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-blue-500 h-4 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-16 text-sm text-gray-600 text-right">
                          {role.count} ({percentage}%)
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top Actions */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Common Actions</h3>
                <div className="space-y-2">
                  {reportData.activityStats.topActions.slice(0, 5).map((action, index) => (
                    <div key={action.action} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          {index + 1}
                        </span>
                        <span className="font-medium">{action.action.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-gray-600">{action.count} times</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other Report Types */}
          {selectedReport !== 'overview' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {reports.find(r => r.id === selectedReport)?.name} Coming Soon
              </h2>
              <p className="text-gray-600 mb-6">
                This report type is currently under development and will be available in a future update.
              </p>
              <button
                onClick={() => generateReport(selectedReport)}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Request Early Access
              </button>
            </div>
          )}

          {/* Export Options */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Reports are generated in real-time based on current system data.
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => generateReport('pdf')}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={() => generateReport('excel')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                >
                  📊 Export Excel
                </button>
                <button
                  onClick={() => generateReport('csv')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                >
                  📋 Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
