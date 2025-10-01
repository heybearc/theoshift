import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface Event {
  id: string
  name: string
  description?: string
  eventType: string
  startDate: string
  endDate: string
  location: string
  status: 'upcoming' | 'current' | 'past'
  attendantsCount: number
  positionsCount: number
}

interface EventsResponse {
  success: boolean
  data: {
    events: Event[]
    currentEvent?: Event
  }
}

export default function EventSelectPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Cache buster: v2.0

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setError('')
      const response = await fetch('/api/events?includeStats=true')
      
      // Check if unauthorized
      if (response.status === 401 || response.status === 403) {
        setLoading(false)
        router.push('/auth/signin')
        return
      }
      
      const data: EventsResponse = await response.json()

      if (data.success) {
        setEvents(data.data.events)
        
        // If there's a current event, auto-redirect
        if (data.data.currentEvent) {
          router.push(`/events/${data.data.currentEvent.id}`)
          return
        }
      } else {
        setError('Failed to load events')
      }
    } catch (err) {
      setError('Error loading events')
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectEvent = async (eventId: string) => {
    try {
      // Set selected event in session
      const response = await fetch('/api/events/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      })

      if (response.ok) {
        router.push(`/events/${eventId}`)
      } else {
        setError('Failed to select event')
      }
    } catch (err) {
      setError('Error selecting event')
      console.error('Error selecting event:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'past':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current':
        return '🟢'
      case 'upcoming':
        return '🔵'
      case 'past':
        return '⚪'
      default:
        return '❓'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
      <div className="container mx-auto px-4 py-8">
        {/* Sign Out Button - Top Right */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            🚪 Sign Out
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎯 Select Event
          </h1>
          <p className="text-blue-100 text-lg">
            Choose which event you'd like to work with
          </p>
          {session?.user?.name && (
            <p className="text-blue-200 mt-2">
              Welcome back, {session.user.name}!
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Events Grid */}
        <div className="max-w-6xl mx-auto">
          {events.length === 0 ? (
            <div className="text-center">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Available</h3>
                <p className="text-gray-600 mb-6">
                  There are no events available for you to select.
                </p>
                {session?.user?.role === 'ADMIN' && (
                  <Link
                    href="/admin/events"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create New Event
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => selectEvent(event.id)}
                >
                  <div className="p-6">
                    {/* Event Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(event.status)}`}>
                        {getStatusIcon(event.status)} {event.status.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">{event.eventType}</span>
                    </div>

                    {/* Event Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {event.name}
                    </h3>

                    {/* Event Description */}
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📅</span>
                        {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📍</span>
                        {event.location}
                      </div>
                    </div>

                    {/* Event Stats */}
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                      <span>👥 {event.attendantsCount} attendants</span>
                      <span>📋 {event.positionsCount} positions</span>
                    </div>

                    {/* Select Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        selectEvent(event.id)
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Select Event
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Actions */}
        {session?.user?.role === 'ADMIN' && (
          <div className="text-center mt-8">
            <Link
              href="/admin"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors mr-4"
            >
              🛡️ Admin Dashboard
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              📅 Manage Events
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  // Admins can access event selection or go directly to admin
  if (session.user?.role === 'ADMIN') {
    // Check if they want to go to admin (could add query param)
    // For now, let them select events too
  }

  return {
    props: {}
  }
}
