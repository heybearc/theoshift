'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface Event {
  id: string
  title: string
  date: string
  location: string
  type: string
}

interface Attendant {
  id: string
  userId: string
  eventId: string
  assignedDate: string
  position: string
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED'
  notes?: string
  createdAt: string
  updatedAt: string
  user: User
  event: Event
}

interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export default function AttendantsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [attendants, setAttendants] = useState<Attendant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<{
    eventId?: string
    status?: string
  }>({})

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      fetchAttendants();
    }
  }, [status, router, filter]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  const fetchAttendants = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = new URLSearchParams()
      if (filter.eventId) params.append('eventId', filter.eventId)
      if (filter.status) params.append('status', filter.status)
      
      const response = await fetch(`/api/attendants?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result: APIResponse<{ attendants: Attendant[] }> = await response.json()
      
      if (result.success && result.data) {
        setAttendants(result.data.attendants)
      } else {
        setError(result.error || 'Failed to load attendants')
      }
    } catch (err) {
      setError('Error loading attendants: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error('Fetch attendants error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateAttendantStatus = async (attendantId: string, newStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED') => {
    try {
      const response = await fetch(`/api/attendants/${attendantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Refresh the attendants list
      fetchAttendants()
    } catch (err) {
      setError('Error updating attendant: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const userRole = (session?.user as { role?: string })?.role || 'ATTENDANT';
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/auth/signin',
      redirect: true 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'DECLINED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'ASSEMBLY':
        return 'bg-purple-100 text-purple-800'
      case 'MEETING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">JW Attendant Scheduler</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-200 hover:text-white transition-colors"
              >
                Dashboard
              </button>
              <span className="text-white font-medium">Attendants</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <div className="font-medium">{userName}</div>
              <div className="text-blue-200 text-xs">{userEmail} ({userRole})</div>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Attendant Management</h2>
            <button
              onClick={fetchAttendants}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Filters */}
          <div className="mb-6 flex space-x-4">
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value || undefined }))}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DECLINED">Declined</option>
            </select>
            
            <select
              value={filter.eventId || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, eventId: e.target.value || undefined }))}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              <option value="1">Circuit Assembly</option>
              <option value="2">Midweek Meeting</option>
              <option value="3">Weekend Meeting</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading attendants...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendants.map((attendant) => (
                    <tr key={attendant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {attendant.user.firstName} {attendant.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attendant.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {attendant.event.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attendant.event.location}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(attendant.event.type)}`}>
                          {attendant.event.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {attendant.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendant.status)}`}>
                          {attendant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(attendant.assignedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {attendant.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => updateAttendantStatus(attendant.id, 'CONFIRMED')}
                            className="text-green-600 hover:text-green-900 transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {attendant.status !== 'DECLINED' && (
                          <button
                            onClick={() => updateAttendantStatus(attendant.id, 'DECLINED')}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Decline
                          </button>
                        )}
                        {attendant.status !== 'PENDING' && (
                          <button
                            onClick={() => updateAttendantStatus(attendant.id, 'PENDING')}
                            className="text-yellow-600 hover:text-yellow-900 transition-colors"
                          >
                            Pending
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {attendants.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No attendants found. Adjust filters or add new attendant assignments.
                </div>
              )}
            </div>
          )}

          {/* Summary Statistics */}
          {attendants.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900">Total Assignments</h4>
                <p className="text-2xl font-bold text-blue-600">{attendants.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900">Confirmed</h4>
                <p className="text-2xl font-bold text-green-600">
                  {attendants.filter(a => a.status === 'CONFIRMED').length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900">Pending</h4>
                <p className="text-2xl font-bold text-yellow-600">
                  {attendants.filter(a => a.status === 'PENDING').length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-900">Declined</h4>
                <p className="text-2xl font-bold text-red-600">
                  {attendants.filter(a => a.status === 'DECLINED').length}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
