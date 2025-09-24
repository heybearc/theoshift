'use client'

import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [stats, setStats] = useState({
    users: 0,
    events: 0,
    attendants: 0
  })

  useEffect(() => {
    // Fetch stats
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(prev => ({ ...prev, users: data.data.pagination.total }))
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Navigation Header */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-white/20 px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              JW
            </div>
            <h1 className="text-xl font-bold text-gray-800">Attendant Scheduler</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-800">Admin User</h4>
              <p className="text-xs text-gray-600">ADMIN • admin@jwscheduler.local</p>
            </div>
            <button className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-sm">Admin Dashboard</h1>
          <p className="text-white/80 text-lg">Complete administrative control for JW Attendant Scheduler</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">👥</div>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.users}</div>
            <div className="text-gray-600 text-sm mb-2">Total Users</div>
            <div className="text-green-600 text-xs font-medium">+2 this week</div>
          </div>
          
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">📅</div>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.events}</div>
            <div className="text-gray-600 text-sm mb-2">Total Events</div>
            <div className="text-green-600 text-xs font-medium">+5 this month</div>
          </div>
          
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">🤝</div>
            </div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{stats.attendants}</div>
            <div className="text-gray-600 text-sm mb-2">Total Attendants</div>
            <div className="text-green-600 text-xs font-medium">+8 active</div>
          </div>
        </div>

        {/* Admin Modules */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
            <span>⚙️</span>
            <span>Admin Modules</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl mb-4">👥</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">User Management</h4>
              <p className="text-gray-600 text-sm mb-4">Create, edit, and manage user accounts with role assignments and permissions.</p>
              <a href="/admin/users" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                Manage Users →
              </a>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl mb-4">📧</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Email Configuration</h4>
              <p className="text-gray-600 text-sm mb-4">Configure SMTP settings and manage email templates for notifications.</p>
              <a href="/admin/email-config" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                Configure Email →
              </a>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center text-2xl mb-4">💚</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Health Monitor</h4>
              <p className="text-gray-600 text-sm mb-4">Monitor system health, database stats, and performance metrics.</p>
              <a href="/admin/health" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                View Health →
              </a>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center text-2xl mb-4">📊</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">API Status</h4>
              <p className="text-gray-600 text-sm mb-4">Monitor API endpoints, response times, and error rates in real-time.</p>
              <a href="/admin/api-status" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                Check APIs →
              </a>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg flex items-center justify-center text-2xl mb-4">📋</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Audit Logs</h4>
              <p className="text-gray-600 text-sm mb-4">View comprehensive audit trails of all system activities and changes.</p>
              <a href="/admin/audit-logs" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                View Logs →
              </a>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-500 rounded-lg flex items-center justify-center text-2xl mb-4">⚡</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">System Operations</h4>
              <p className="text-gray-600 text-sm mb-4">Perform system maintenance, backups, and operational tasks safely.</p>
              <a href="/admin/system-ops" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                System Ops →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}