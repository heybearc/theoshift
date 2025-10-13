import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  eventType: string
  startDate: string
  endDate: string
  status: string
}

interface AttendantSession {
  attendant: {
    id: string
    firstName: string
    lastName: string
    congregation: string
  }
  events: Event[]
  loginTime: string
}

export default function AttendantSelectEvent() {
  const router = useRouter()
  const [session, setSession] = useState<AttendantSession | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load attendant session
    const sessionData = localStorage.getItem('attendantSession')
    if (!sessionData) {
      router.push('/attendant/login')
      return
    }

    try {
      const parsedSession = JSON.parse(sessionData)
      setSession(parsedSession)

      // If only one event, redirect to dashboard
      if (parsedSession.events.length === 1) {
        localStorage.setItem('selectedEventId', parsedSession.events[0].id)
        router.push('/attendant/dashboard')
      }
    } catch (error) {
      console.error('Error parsing session:', error)
      router.push('/attendant/login')
    }
  }, [router])

  const handleEventSelect = (eventId: string) => {
    setLoading(true)
    
    // Store selected event
    localStorage.setItem('selectedEventId', eventId)
    
    // Redirect to dashboard
    router.push('/attendant/dashboard')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CURRENT':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CURRENT':
        return '🟢'
      case 'UPCOMING':
        return '🔵'
      default:
        return '⚪'
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Select Event | JW Attendant Scheduler</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl text-white">📅</span>
            </div>
            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              Select Event
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Welcome, {session.attendant.firstName}!
            </p>
            <p className="text-sm text-gray-500">
              You're assigned to multiple events. Please select which one to view.
            </p>
          </div>

          {/* Event Cards */}
          <div className="space-y-4">
            {session.events.map((event) => (
              <div
                key={event.id}
                className="bg-white shadow-lg rounded-lg border border-gray-200 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleEventSelect(event.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {event.name}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(event.status)}`}>
                          {getStatusIcon(event.status)} {event.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {event.eventType}
                      </p>
                      
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex items-center">
                          <span className="w-16 text-gray-500">Start:</span>
                          <span className="font-medium">{formatDate(event.startDate)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-16 text-gray-500">End:</span>
                          <span className="font-medium">{formatDate(event.endDate)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <div className="text-2xl text-blue-600">→</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link
              href="/attendant/login"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Login
            </Link>
          </div>

          {/* Info Panel */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-blue-400 text-sm">ℹ️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Multiple Event Assignment
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  You can switch between events anytime from your dashboard. 
                  Each event will show your specific assignments and documents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading your dashboard...</span>
          </div>
        </div>
      )}
    </>
  )
}
