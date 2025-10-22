import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventLayout from '../../../components/EventLayout'
import CreateCountSessionModal from '../../../components/CreateCountSessionModal'
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
    position: {
      id: string
      positionNumber: number
      name: string
      area?: string
    }
  }>
}

interface Event {
  id: string
  name: string
}

interface CountStats {
  total: number
  active: number
  completed: number
}

interface EventCountTimesPageProps {
  eventId: string
  event: Event
  countSessions: CountSession[]
  canManageContent: boolean
  stats: CountStats
}

export default function EventCountTimesPage({ eventId, event, countSessions, canManageContent, stats }: EventCountTimesPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // APEX GUARDIAN: Client-side fetching removed - data now provided via SSR

  const createCountSession = async (data: { sessionName: string; countTime: string; notes?: string }) => {
    const response = await fetch(`/api/events/${eventId}/count-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create count session')
    }
    
    router.reload() // Refresh page to show updated data
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
              {canManageContent && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ➕ New Count Session
                </button>
              )}
            </div>
          </div>
        </div>

        {countSessions.length === 0 ? (
          /* No Count Sessions */
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Count Sessions</h3>
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">{canManageContent ? 'No count sessions created yet' : 'No count sessions available'}</p>
              {canManageContent && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Create First Count Session
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Count Sessions List */
          <div className="space-y-6">
            {countSessions.map((session) => (
              <div key={session.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
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
                      {canManageContent && (
                        <Link
                          href={`/events/${eventId}/count-times/${session.id}/enter-count`}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                          📝 Enter Counts
                        </Link>
                      )}
                      <Link
                        href={`/events/${eventId}/count-times/${session.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                  {session.position_counts.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Session Total:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {session.position_counts.reduce((sum, count) => sum + (count.attendeeCount || 0), 0)}
                        </span>
                      </div>
                    </div>
                  )}
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
                                {count.position.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {count.position.area || ''}
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

        {/* Create Count Session Modal */}
        {canManageContent && (
          <CreateCountSessionModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={createCountSession}
          />
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

  // APEX GUARDIAN: Full SSR data fetching for count-times tab
  const { id } = context.params!
  
  try {
    const { prisma } = await import('../../../src/lib/prisma')
    
    // Fetch event with count sessions and position counts data
    const eventData = await prisma.events.findUnique({
      where: { id: id as string },
      include: {
        count_sessions: {
          include: {
            position_counts: {
              include: {
                position: {
                  select: {
                    id: true,
                    positionNumber: true,
                    name: true,
                    area: true
                  }
                }
              },
              orderBy: [
                { position: { positionNumber: 'asc' } }
              ]
            }
          },
          orderBy: [
            { createdAt: 'desc' }
          ]
        }
      }
    })
    
    if (!eventData) {
      return { notFound: true }
    }

    // Transform event data
    const event = {
      id: eventData.id,
      name: eventData.name
    }

    // Transform count sessions data
    const countSessions = eventData.count_sessions.map(session => ({
      id: session.id,
      sessionName: session.sessionName,
      countTime: session.countTime?.toISOString() || null,
      notes: session.notes,
      status: session.status,
      isActive: session.isActive,
      createdAt: session.createdAt?.toISOString() || null,
      position_counts: session.position_counts.map(count => ({
        id: count.id,
        positionId: count.positionId,
        attendeeCount: count.attendeeCount,
        notes: count.notes,
        countedBy: count.countedBy,
        countedAt: count.countedAt?.toISOString() || null,
        position: {
          id: count.position.id,
          positionNumber: count.position.positionNumber,
          name: count.position.name,
          area: count.position.area || ''
        }
      }))
    }))

    // Check event-specific permissions
    const { canManageAttendants } = await import('../../../src/lib/eventAccess')
    const userId = session.user?.id || ''
    const canManageContent = await canManageAttendants(userId, id as string)

    return {
      props: {
        eventId: id as string,
        event,
        countSessions,
        canManageContent,
        stats: {
          total: countSessions.length,
          active: countSessions.filter(s => s.isActive).length,
          completed: countSessions.filter(s => s.status === 'COMPLETED').length
        }
      }
    }
  } catch (error) {
    console.error('Error fetching count-times data:', error)
    return { notFound: true }
  }
}
