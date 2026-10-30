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
import { getLatestRelease } from '../../src/lib/releaseNotes'
import { prisma } from '../../src/lib/prisma'
import { getUserEvents } from '../../src/lib/eventAccess'

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
  parentEventId?: string | null
  childEvents?: Array<{ id: string; name: string }>
}

interface EventSelectPageProps {
  events: Event[]
  userLastSeenVersion?: string | null
  releaseSummary?: string
}

export default function EventSelectPage({ events, userLastSeenVersion, releaseSummary }: EventSelectPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['COMPLETED', 'ARCHIVED', 'CANCELLED']))
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
        // Use window.location for full page reload to avoid client-side routing issues
        window.location.href = `/events/${eventId}`
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

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const toggleSectionCollapse = (status: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(status)) {
      newCollapsed.delete(status)
    } else {
      newCollapsed.add(status)
    }
    setCollapsedSections(newCollapsed)
  }

  // Status priority for sorting
  const getStatusPriority = (status: string): number => {
    switch (status.toUpperCase()) {
      case 'CURRENT': return 1
      case 'UPCOMING': return 2
      case 'COMPLETED': return 3
      case 'PAST': return 3
      case 'ARCHIVED': return 4
      case 'CANCELLED': return 5
      default: return 6
    }
  }

  // Sort events by status priority, then by start date descending
  const sortEvents = (events: Event[]): Event[] => {
    return [...events].sort((a, b) => {
      const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status)
      if (statusDiff !== 0) return statusDiff
      
      // Within same status, sort by start date descending (newest first)
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    })
  }

  // Filter events based on search query
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      event.name.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.eventType.toLowerCase().includes(query)
    )
  })

  // Organize events into parent/child hierarchy with sorting
  const sortedFilteredEvents = sortEvents(filteredEvents)
  const parentEvents = sortedFilteredEvents.filter(e => !e.parentEventId)
  const childEventsMap = new Map<string, Event[]>()
  sortedFilteredEvents.forEach(event => {
    if (event.parentEventId) {
      const children = childEventsMap.get(event.parentEventId) || []
      children.push(event)
      childEventsMap.set(event.parentEventId, children)
    }
  })

  // Sort child events within each parent
  childEventsMap.forEach((children, parentId) => {
    childEventsMap.set(parentId, sortEvents(children))
  })

  // Group parent events by status
  const eventsByStatus = new Map<string, Event[]>()
  parentEvents.forEach(event => {
    const status = event.status.toUpperCase()
    const normalizedStatus = status === 'PAST' ? 'COMPLETED' : status
    const events = eventsByStatus.get(normalizedStatus) || []
    events.push(event)
    eventsByStatus.set(normalizedStatus, events)
  })

  // Define status groups in display order
  const statusGroups = [
    { key: 'CURRENT', label: 'Current Events', icon: '🟢' },
    { key: 'UPCOMING', label: 'Upcoming Events', icon: '🔵' },
    { key: 'COMPLETED', label: 'Completed Events', icon: '✅' },
    { key: 'ARCHIVED', label: 'Archived Events', icon: '📦' },
    { key: 'CANCELLED', label: 'Cancelled Events', icon: '❌' }
  ]

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
        releaseSummary={releaseSummary}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {(session?.user?.role === 'ADMIN' || session?.user?.role === 'admin') && (
              <Link
                href="/admin"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                🛡️ Admin Portal
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              👤 My Profile
            </Link>
            <button
              onClick={() => signOut({ redirect: true }).then(() => window.location.href = '/auth/signin')}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/logo.svg"
              alt="TheoShift Logo"
              className="h-24 w-24 drop-shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Select Event
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

        {/* Search Bar */}
        {events.length > 0 && (
          <div className="max-w-6xl mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search events by name, location, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500 rounded-lg border-2 border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-blue-100">
                Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </p>
            )}
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
          ) : filteredEvents.length === 0 ? (
            <div className="text-center">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
                <p className="text-gray-600 mb-6">
                  No events match your search criteria. Try adjusting your search.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {statusGroups.map(({ key, label, icon }) => {
                const statusEvents = eventsByStatus.get(key) || []
                if (statusEvents.length === 0) return null
                
                const isSectionCollapsed = collapsedSections.has(key)
                
                return (
                  <div key={key} className="space-y-4">
                    {/* Status Section Header */}
                    <button
                      onClick={() => toggleSectionCollapse(key)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-5 h-5 text-white transition-transform ${isSectionCollapsed ? '' : 'rotate-90'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <span>{icon}</span>
                          <span>{label}</span>
                        </h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/30 text-white">
                          {statusEvents.length}
                        </span>
                      </div>
                      <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                        {isSectionCollapsed ? 'Click to expand' : 'Click to collapse'}
                      </span>
                    </button>

                    {/* Status Section Events */}
                    {!isSectionCollapsed && (
                      <div className="space-y-4 pl-4">
                        {statusEvents.map((event) => {
                          const children = childEventsMap.get(event.id) || []
                          const hasChildren = children.length > 0
                          const isExpanded = expandedEvents.has(event.id)
                          
                          return (
                            <div key={event.id}>
                    {/* Parent Event Card */}
                    <div className="relative">
                      {hasChildren && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleEventExpansion(event.id)
                          }}
                          className="absolute -left-8 top-6 z-10 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      <div
                        className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                        onClick={() => selectEvent(event.id)}
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(event.status)}`}>
                              {getStatusIcon(event.status)} {event.status.toUpperCase()}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">{event.eventType}</span>
                              {hasChildren && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                  {children.length} child event{children.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {event.name}
                          </h3>

                          {event.description && (
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="mr-2">📅</span>
                              {(() => {
                                try {
                                  const startPart = event.startDate.split('T')[0]
                                  const endPart = event.endDate.split('T')[0]
                                  const start = format(parseISO(startPart + 'T12:00:00'), 'MMM d, yyyy')
                                  const end = format(parseISO(endPart + 'T12:00:00'), 'MMM d, yyyy')
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

                          <div className="flex justify-between text-sm text-gray-500 mb-4">
                            <span>👥 {event.attendantsCount} volunteers</span>
                            <span>📋 {event.positionsCount} positions</span>
                          </div>

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
                    </div>

                    {/* Child Events */}
                    {hasChildren && isExpanded && (
                      <div className="ml-8 mt-4 space-y-4 relative">
                        {/* Vertical connector line */}
                        <div className="absolute left-0 top-0 bottom-4 w-px bg-gray-300"></div>
                        
                        {children.map((childEvent) => (
                          <div key={childEvent.id} className="relative pl-8">
                            {/* Horizontal connector */}
                            <div className="absolute left-0 top-6 w-8 h-px bg-gray-300"></div>
                            
                            <div
                              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-purple-400"
                              onClick={() => selectEvent(childEvent.id)}
                            >
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(childEvent.status)}`}>
                                    {getStatusIcon(childEvent.status)} {childEvent.status.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-500">{childEvent.eventType}</span>
                                </div>

                                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                  {childEvent.name}
                                </h4>

                                {childEvent.description && (
                                  <p className="text-gray-600 text-sm mb-3 line-clamp-1">
                                    {childEvent.description}
                                  </p>
                                )}

                                <div className="space-y-1.5 mb-3">
                                  <div className="flex items-center text-xs text-gray-600">
                                    <span className="mr-2">📅</span>
                                    {(() => {
                                      try {
                                        const startPart = childEvent.startDate.split('T')[0]
                                        const endPart = childEvent.endDate.split('T')[0]
                                        const start = format(parseISO(startPart + 'T12:00:00'), 'MMM d, yyyy')
                                        const end = format(parseISO(endPart + 'T12:00:00'), 'MMM d, yyyy')
                                        return `${start} - ${end}`
                                      } catch {
                                        return 'Invalid date range'
                                      }
                                    })()}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-600">
                                    <span className="mr-2">📍</span>
                                    {childEvent.location}
                                  </div>
                                </div>

                                <div className="flex justify-between text-xs text-gray-500 mb-3">
                                  <span>👥 {childEvent.attendantsCount}</span>
                                  <span>📋 {childEvent.positionsCount}</span>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    selectEvent(childEvent.id)
                                  }}
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                                >
                                  Select Child Event
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
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

  // CRITICAL: Volunteers should NEVER access this page - redirect to volunteer portal
  if (session.user?.role === 'VOLUNTEER') {
    return {
      redirect: {
        destination: '/volunteer/dashboard',
        permanent: false,
      },
    }
  }

  // Only ADMIN, OVERSEER, ASSISTANT_OVERSEER, KEYMAN roles can access this page
  if (!['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'].includes(session.user?.role || '')) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  try {
    // Get events user has access to (respects permissions)
    const userEvents = await getUserEvents(session.user.id)
    
    // Get counts for each event
    const eventsWithCounts = await Promise.all(
      userEvents.map(async (event: any) => {
        // Count volunteers by querying event_volunteers directly
        const volunteersCount = await prisma.event_volunteers.count({
          where: {
            eventId: event.id,
            isActive: true
          }
        })
        
        const positionsCount = await prisma.positions.count({
          where: { eventId: event.id }
        })
        
        return {
          ...event,
          attendantsCount: volunteersCount,
          positionsCount: positionsCount
        }
      })
    )

    // Transform events data
    const events: Event[] = eventsWithCounts.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description || undefined,
      eventType: event.eventType,
      startDate: event.startDate ? format(event.startDate, 'yyyy-MM-dd') + 'T12:00:00' : '',
      endDate: event.endDate ? format(event.endDate, 'yyyy-MM-dd') + 'T12:00:00' : '',
      location: event.location || '',
      status: event.status,
      attendantsCount: event.attendantsCount,
      positionsCount: event.positionsCount,
      parentEventId: event.parentEventId || null,
      childEvents: event.childEvents || []
    }))

    // Get user's lastSeenReleaseVersion
    const currentUser = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: { lastSeenReleaseVersion: true }
    })

    // Get latest release info for banner
    const latestRelease = getLatestRelease()

    return {
      props: {
        events: events,
        userLastSeenVersion: currentUser?.lastSeenReleaseVersion || null,
        releaseSummary: latestRelease?.summary || null
      }
    }
  } catch (error) {
    console.error('Error loading events:', error)
    console.error('Session user ID:', session.user?.id)
    console.error('Session user email:', session.user?.email)
    console.error('Session user role:', session.user?.role)
    // Return empty events list on error
    return {
      props: {
        events: [],
        userLastSeenVersion: null,
        releaseSummary: null
      }
    }
  }
}
