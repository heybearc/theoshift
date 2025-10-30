import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { useSession, signOut } from 'next-auth/react'
import { authOptions } from '../api/auth/[...nextauth]'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import ReleaseBanner from '../../components/ReleaseBanner'
import packageJson from '../../package.json'

interface Event {
  id: string
  name: string
  description?: string
  eventType: string
  startDate: string
  endDate: string
  location: string
  status: string
  attendantsCount: number
  positionsCount: number
}

interface EventSelectPageProps {
  events: Event[]
  userLastSeenVersion?: string | null
}

export default function EventSelectPage({ events, userLastSeenVersion }: EventSelectPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [error, setError] = useState('')
  const loading = false // No loading state needed with SSR

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
    switch (status.toUpperCase()) {
      case 'CURRENT':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PAST':
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'ARCHIVED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CURRENT':
        return '🟢'
      case 'UPCOMING':
        return '🔵'
      case 'PAST':
      case 'COMPLETED':
        return '✅'
      case 'ARCHIVED':
        return '📦'
      case 'CANCELLED':
        return '❌'
      default:
        return '📅'
    }
  }

  // No loading state needed with SSR - data is always available
  if (!events) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="text-center text-white">
          <p>No events data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
      {/* Release Banner */}
      <ReleaseBanner 
        currentVersion={packageJson.version}
        userLastSeenVersion={userLastSeenVersion}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-4">
          <div>
            {session?.user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                🛡️ Admin Portal
              </Link>
            )}
          </div>
          <button
            onClick={() => signOut({ redirect: true }).then(() => window.location.href = '/auth/signin')}
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
          
          {/* Create Event Button for Senior Roles */}
          {session?.user?.role && ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER'].includes(session.user.role) && (
            <div className="mt-6">
              <Link
                href="/events/create"
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors gap-2"
              >
                ➕ Create New Event
              </Link>
            </div>
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
                        {(() => {
                          // Use date-fns for consistent SSR/client formatting
                          try {
                            const start = format(parseISO(event.startDate), 'MMM d, yyyy')
                            const end = format(parseISO(event.endDate), 'MMM d, yyyy')
                            return `${start} - ${end}`
                          } catch {
                            return 'Invalid date range'
                          }
                        })()}
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

        {/* Help Links for Non-Admin Users */}
        <div className="text-center mt-8">
          <div className="flex justify-center space-x-6 text-sm">
            <Link
              href="/help"
              className="text-blue-200 hover:text-white transition-colors flex items-center gap-1"
            >
              ❓ Help Center
            </Link>
            <Link
              href="/release-notes"
              className="text-blue-200 hover:text-white transition-colors flex items-center gap-1"
            >
              📋 Release Notes
            </Link>
            <Link
              href="/help/feedback"
              className="text-blue-200 hover:text-white transition-colors flex items-center gap-1"
            >
              💬 Send Feedback
            </Link>
            <Link
              href="/help/my-feedback"
              className="text-blue-200 hover:text-white transition-colors flex items-center gap-1"
            >
              📝 My Feedback
            </Link>
          </div>
        </div>

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

  // CRITICAL: Attendants should NEVER access this page - redirect to attendant portal
  if (session.user?.role === 'ATTENDANT') {
    return {
      redirect: {
        destination: '/attendant/dashboard',
        permanent: false,
      },
    }
  }

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN roles can access this page
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  // Fetch events with proper permission filtering
  const { prisma } = await import('../../src/lib/prisma')
  const { getUserEvents } = await import('../../src/lib/eventAccess')
  
  // Get events user has access to (respects permissions)
  const userEvents = await getUserEvents(session.user.id)
  
  // Get counts for each event
  const eventsWithCounts = await Promise.all(
    userEvents.map(async (event: any) => {
      const counts = await prisma.events.findUnique({
        where: { id: event.id },
        select: {
          _count: {
            select: {
              event_attendants: true,
              positions: true
            }
          }
        }
      })
      
      return {
        ...event,
        attendantsCount: counts?._count.event_attendants || 0,
        positionsCount: counts?._count.positions || 0
      }
    })
  )

  // Transform events data
  const events: Event[] = eventsWithCounts.map(event => ({
    id: event.id,
    name: event.name,
    description: event.description || undefined,
    eventType: event.eventType,
    startDate: event.startDate ? format(event.startDate, 'yyyy-MM-dd') : '',
    endDate: event.endDate ? format(event.endDate, 'yyyy-MM-dd') : '',
    location: event.location || '',
    status: event.status,
    attendantsCount: event.attendantsCount,
    positionsCount: event.positionsCount
  }))

  // Get user's lastSeenReleaseVersion
  const currentUser = await prisma.users.findUnique({
    where: { email: session.user.email },
    select: { lastSeenReleaseVersion: true }
  })

  return {
    props: {
      events,
      userLastSeenVersion: currentUser?.lastSeenReleaseVersion || null
    }
  }
}
