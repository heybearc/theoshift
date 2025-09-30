import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface CountSession {
  id: string
  sessionName: string
  countTime: string
  notes?: string
  status: string
  isActive: boolean
  createdAt: string
  position_counts: Array<{
    id: string
    positionId: string
    attendeeCount: number
    notes?: string
    countedBy?: string
    countedAt: string
    event_positions: {
      id: string
      positionNumber: number
      title: string
      department: string
    }
  }>
}

interface Event {
  id: string
  name: string
  countTimesEnabled: boolean
}

export default function EventCountTimesPage() {
  const router = useRouter()
  const { id: eventId } = router.query
  const [event, setEvent] = useState<Event | null>(null)
  const [countSessions, setCountSessions] = useState<CountSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (eventId) {
      fetchEventAndCountSessions()
    }
  }, [eventId])

  const fetchEventAndCountSessions = async () => {
    try {
      setLoading(true)
      
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`)
      const eventData = await eventResponse.json()
      
      if (eventData.success) {
        setEvent(eventData.data)
        
        // Fetch count sessions
        const sessionsResponse = await fetch(`/api/events/${eventId}/count-sessions`)
        const sessionsData = await sessionsResponse.json()
        
        if (sessionsData.success) {
          setCountSessions(sessionsData.data)
        }
      } else {
        setError('Event not found')
      }
    } catch (err) {
      setError('Error loading count times')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const enableCountTimes = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countTimesEnabled: true })
      })
      
      if (response.ok) {
        setEvent(prev => prev ? { ...prev, countTimesEnabled: true } : null)
      }
    } catch (err) {
      console.error('Error enabling count times:', err)
    }
  }

  const createCountSession = async () => {
    const sessionName = prompt('Enter count session name (e.g., "First Count", "Second Count"):')
    if (!sessionName) return

    try {
      const response = await fetch(`/api/events/${eventId}/count-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName,
          countTime: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        fetchEventAndCountSessions()
      }
    } catch (err) {
      console.error('Error creating count session:', err)
    }
  }

  if (loading) {
    return (
      <EventLayout 
        title="Count Times"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: event?.name || 'Loading...', href: `/events/${eventId}` },
          { label: 'Count Times' }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading count times...</p>
        </div>
      </EventLayout>
    )
  }

  if (error || !event) {
    return (
      <EventLayout 
        title="Count Times"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: 'Error' }
        ]}
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Event not found'}</p>
          <Link
            href="/events"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </EventLayout>
    )
  }

  return (
    <EventLayout 
      title="Count Times"
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event.name, href: `/events/${eventId}` },
        { label: 'Count Times' }
      ]}
      selectedEvent={{
        id: event.id,
        name: event.name
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Count Times</h1>
              <p className="text-gray-600">Manage attendance counting sessions for this event</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/events/${eventId}`}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Event
              </Link>
              {event.countTimesEnabled && (
                <button
                  onClick={createCountSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ➕ New Count Session
                </button>
              )}
            </div>
          </div>
        </div>

        {!event.countTimesEnabled ? (
          /* Count Times Disabled */
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Count Times Not Enabled</h3>
            <p className="text-gray-600 mb-6">
              Enable count times to track attendance at different points during the event.
            </p>
            <button
              onClick={enableCountTimes}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Enable Count Times
            </button>
          </div>
        ) : countSessions.length === 0 ? (
          /* No Count Sessions */
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Count Sessions</h3>
            <p className="text-gray-600 mb-6">
              Create your first count session to start tracking attendance.
            </p>
            <button
              onClick={createCountSession}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Create First Count Session
            </button>
          </div>
        ) : (
          /* Count Sessions List */
          <div className="space-y-6">
            {countSessions.map((session) => (
              <div key={session.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{session.sessionName}</h3>
                      <p className="text-sm text-gray-600">
                        Count Time: {new Date(session.countTime).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        session.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                      <Link
                        href={`/events/${eventId}/count-times/${session.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
                
                {session.position_counts.length > 0 && (
                  <div className="px-6 py-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Position Counts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {session.position_counts.map((count) => (
                        <div key={count.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {count.event_positions.title}
                              </p>
                              <p className="text-sm text-gray-600">
                                {count.event_positions.department}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">
                                {count.attendeeCount}
                              </p>
                              <p className="text-xs text-gray-500">attendees</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </EventLayout>
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

  return {
    props: {},
  }
}
