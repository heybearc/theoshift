'use client'

import { useAuth } from '../providers'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardStats {
  totalEvents: number
  upcomingEvents: number
  totalAttendants: number
  myAssignments: number
}

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    totalAttendants: 0,
    myAssignments: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchDashboardStats()
  }, [user, authLoading, router])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
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
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <div className="space-x-4">
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Admin Panel
                </Link>
              )}
              <button
                onClick={() => logout().then(() => router.push('/auth/signin'))}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Total Events</h3>
              <p className="text-2xl font-bold text-blue-700">{stats.totalEvents}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Upcoming Events</h3>
              <p className="text-2xl font-bold text-green-700">{stats.upcomingEvents}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900">Total Attendants</h3>
              <p className="text-2xl font-bold text-purple-700">{stats.totalAttendants}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-900">My Assignments</h3>
              <p className="text-2xl font-bold text-orange-700">{stats.myAssignments}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/events"
              className="bg-blue-100 border border-blue-200 rounded-lg p-6 hover:bg-blue-200 transition-colors"
            >
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Event Management</h3>
              <p className="text-blue-700">Create and manage events, positions, and schedules</p>
            </Link>

            <Link
              href="/attendants"
              className="bg-green-100 border border-green-200 rounded-lg p-6 hover:bg-green-200 transition-colors"
            >
              <h3 className="text-xl font-semibold text-green-900 mb-2">Attendant Management</h3>
              <p className="text-green-700">Manage attendant profiles and assignments</p>
            </Link>

            <Link
              href="/counts"
              className="bg-purple-100 border border-purple-200 rounded-lg p-6 hover:bg-purple-200 transition-colors"
            >
              <h3 className="text-xl font-semibold text-purple-900 mb-2">Count Tracking</h3>
              <p className="text-purple-700">Track attendance counts and generate reports</p>
            </Link>

            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="bg-red-600 text-white p-6 rounded-lg shadow hover:bg-red-700 transition-colors"
              >
                <h3 className="text-xl font-semibold mb-2">👥 Admin Panel</h3>
                <p className="text-red-100">Manage users, email config, and system settings</p>
              </Link>
            )}

            <Link
              href="/assignments"
              className="bg-yellow-100 border border-yellow-200 rounded-lg p-6 hover:bg-yellow-200 transition-colors"
            >
              <h3 className="text-xl font-semibold text-yellow-900 mb-2">My Assignments</h3>
              <p className="text-yellow-700">View your current and upcoming assignments</p>
            </Link>

            <Link
              href="/documents"
              className="bg-indigo-100 border border-indigo-200 rounded-lg p-6 hover:bg-indigo-200 transition-colors"
            >
              <h3 className="text-xl font-semibold text-indigo-900 mb-2">Documents</h3>
              <p className="text-indigo-700">Access event documents and resources</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
