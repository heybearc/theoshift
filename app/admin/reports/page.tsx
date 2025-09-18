import { getServerSession } from 'next-auth/next'
import { authConfig } from '../../../auth.config'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface ReportData {
  id: string
  name: string
  description: string
  type: 'USER' | 'SYSTEM' | 'ATTENDANCE' | 'FINANCIAL'
  lastGenerated: string
  recordCount: number
}

export default async function ReportsPage() {
  // Server-side authentication check
  const session = await getServerSession(authConfig)

  if (!session || !session.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized')
  }

  // Mock reports data
  const reports: ReportData[] = [
    {
      id: '1',
      name: 'User Activity Report',
      description: 'Detailed report of user login activity and system usage',
      type: 'USER',
      lastGenerated: new Date().toISOString(),
      recordCount: 156
    },
    {
      id: '2',
      name: 'Attendance Summary',
      description: 'Monthly attendance summary for all attendants',
      type: 'ATTENDANCE',
      lastGenerated: new Date(Date.now() - 86400000).toISOString(),
      recordCount: 89
    },
    {
      id: '3',
      name: 'System Performance',
      description: 'System performance metrics and error logs',
      type: 'SYSTEM',
      lastGenerated: new Date(Date.now() - 172800000).toISOString(),
      recordCount: 234
    }
  ]

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'USER': return 'bg-blue-100 text-blue-800'
      case 'ATTENDANCE': return 'bg-green-100 text-green-800'
      case 'SYSTEM': return 'bg-purple-100 text-purple-800'
      case 'FINANCIAL': return 'bg-yellow-100 text-yellow-800'
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
                <h1 className="text-3xl font-bold text-gray-900">Administrative Reports</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Generate and view administrative reports
                </p>
              </div>
              <Link
                href="/admin"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Admin
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{reports.length}</div>
                <div className="text-sm text-blue-700">Available Reports</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {reports.reduce((sum, r) => sum + r.recordCount, 0)}
                </div>
                <div className="text-sm text-green-700">Total Records</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">
                  {reports.filter(r => r.type === 'SYSTEM').length}
                </div>
                <div className="text-sm text-purple-700">System Reports</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">
                  {reports.filter(r => r.type === 'ATTENDANCE').length}
                </div>
                <div className="text-sm text-yellow-700">Attendance Reports</div>
              </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(report.type)}`}>
                      {report.type}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{report.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Last Generated:</span>
                      <span className="text-gray-900">
                        {new Date(report.lastGenerated).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Records:</span>
                      <span className="text-gray-900">{report.recordCount.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                      Generate
                    </button>
                    <button className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Report Generation Form */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Custom Report</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Report Type
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select type...</option>
                      <option value="USER">User Report</option>
                      <option value="ATTENDANCE">Attendance Report</option>
                      <option value="SYSTEM">System Report</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="custom">Custom range</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
