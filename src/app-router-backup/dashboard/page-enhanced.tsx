'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
}

interface Event {
  id: string
  title: string
  description?: string
  date: string
  location: string
  type: string
  attendantsNeeded: number
  isActive: boolean
  createdAt: string
}

interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events'>('overview')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result: APIResponse<{ users: User[] }> = await response.json()
      
      if (result.success && result.data) {
        setUsers(result.data.users)
      } else {
        setError(result.error || 'Failed to load users')
      }
    } catch (err) {
      setError('Error loading users: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error('Fetch users error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/events')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result: APIResponse<{ events: Event[] }> = await response.json()
      
      if (result.success && result.data) {
        setEvents(result.data.events)
      } else {
        setError(result.error || 'Failed to load events')
      }
    } catch (err) {
      setError('Error loading events: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error('Fetch events error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchUsers();
      fetchEvents();
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = (session.user as { role?: string })?.role || 'ATTENDANT';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">JW Attendant Scheduler</h1>
          <div className="flex items-center space-x-4">
            <span>Welcome, {session.user?.name} ({userRole})</span>
            <button
              onClick={() => signOut()}
              className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto">
          <div className="flex space-x-8">
            {(['overview', 'users', 'events'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                JW Attendant Scheduler Dashboard
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Enhanced with WMACS Guardian - Phase 4 Implementation
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-blue-600">{users.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Events</h3>
                <p className="text-3xl font-bold text-green-600">{events.filter(e => e.isActive).length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Attendants Needed</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {events.reduce((sum, e) => sum + e.attendantsNeeded, 0)}
                </p>
              </div>
            </div>

            {/* WMACS Status */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🛡️ WMACS Guardian System Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700">Phase 4 Features</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>✅ Enhanced Dashboard with Tabs</li>
                    <li>✅ User Management Integration</li>
                    <li>✅ Events API Implementation</li>
                    <li>✅ Real-time Data Loading</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700">WMACS Guardian</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>✅ Container 134 (Staging)</li>
                    <li>✅ Terminal Stabilization Active</li>
                    <li>✅ CI/CD Pipeline Enforced</li>
                    <li>✅ IDE Integration Active</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded"
              >
                {loading ? 'Loading...' : 'Refresh Users'}
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading users...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {users.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    No users found. Click "Refresh Users" to load data.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Event Management</h2>
              <button
                onClick={fetchEvents}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded"
              >
                {loading ? 'Loading...' : 'Refresh Events'}
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading events...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        event.type === 'ASSEMBLY' ? 'bg-purple-100 text-purple-800' :
                        event.type === 'MEETING' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.type}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                    )}
                    <div className="space-y-1 text-sm text-gray-500">
                      <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                      <p>📍 {event.location}</p>
                      <p>👥 {event.attendantsNeeded} attendants needed</p>
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && !loading && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No events found. Click "Refresh Events" to load data.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
