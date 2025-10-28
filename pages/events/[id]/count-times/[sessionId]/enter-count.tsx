import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../api/auth/[...nextauth]'
import EventLayout from '../../../../../components/EventLayout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

interface Position {
  id: string
  positionNumber: number
  name: string
  description?: string
  area?: string
  currentCount?: number
  hasSubmitted?: boolean
}

interface CountSession {
  id: string
  sessionName: string
  countTime: string
  status: string
}

interface Event {
  id: string
  name: string
}

export default function EnterCountPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { id: eventId, sessionId } = router.query
  const [event, setEvent] = useState<Event | null>(null)
  const [countSession, setCountSession] = useState<CountSession | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [positionCounts, setPositionCounts] = useState<Record<string, string>>({}) // Track count per position
  const [positionNotes, setPositionNotes] = useState<Record<string, string>>({}) // Track notes per position
  const [submittingPositions, setSubmittingPositions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (eventId && sessionId) {
      fetchData()
    }
  }, [eventId, sessionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch event, count session, positions, and existing counts
      const [eventRes, sessionRes, positionsRes, countsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}`),
        fetch(`/api/events/${eventId}/positions?includeAssignments=true&limit=1000`),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}/counts`)
      ])
      
      const [eventData, sessionData, positionsData, countsData] = await Promise.all([
        eventRes.json(),
        sessionRes.json(),
        positionsRes.json(),
        countsRes.json()
      ])
      
      if (eventData.success) setEvent(eventData.data)
      if (sessionData.success) setCountSession(sessionData.data)
      
      // Create a map of position IDs to their counts
      const countsByPosition = new Map()
      if (countsData.success && countsData.data) {
        countsData.data.forEach((count: any) => {
          countsByPosition.set(count.positionId, count)
        })
      }
      
      if (positionsData.success && positionsData.data?.positions) {
        // ADMIN, OVERSEER, KEYMAN can see all positions
        // ATTENDANT can only see positions they're assigned to
        const userRole = session?.user?.role
        const allPositions = positionsData.data.positions.map((pos: any) => {
          const existingCount = countsByPosition.get(pos.id)
          return {
            ...pos,
            hasSubmitted: !!existingCount,
            currentCount: existingCount?.attendeeCount
          }
        })
        
        if (['ADMIN', 'OVERSEER', 'KEYMAN'].includes(userRole || '')) {
          // Show all positions for admin roles
          setPositions(allPositions)
        } else {
          // Filter positions that the current attendant is assigned to
          const userPositions = allPositions.filter((pos: any) => 
            pos.assignments?.some((assignment: any) => 
              assignment.attendantId === session?.user?.id
            )
          )
          setPositions(userPositions)
        }
      }
      
    } catch (err) {
      console.error('Error loading data:', err)
      // Only set error if we have no positions loaded
      if (positions.length === 0) {
        setError('Error loading data')
      }
    } finally {
      setLoading(false)
    }
  }

  const submitCount = async (position: Position) => {
    const countValue = positionCounts[position.id]
    if (!countValue || countValue.trim() === '') {
      setError('Please enter a count for this position')
      return
    }

    const count = parseInt(countValue)
    if (isNaN(count) || count < 0) {
      setError('Please enter a valid number')
      return
    }

    try {
      setSubmittingPositions(prev => new Set(prev).add(position.id))
      setError('')
      
      const response = await fetch(`/api/events/${eventId}/count-sessions/${sessionId}/counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: position.id,
          attendeeCount: count,
          notes: positionNotes[position.id]?.trim() || undefined
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Count submitted for ${position.name}!`)
        
        // Clear this position's inputs
        setPositionCounts(prev => {
          const newCounts = { ...prev }
          delete newCounts[position.id]
          return newCounts
        })
        setPositionNotes(prev => {
          const newNotes = { ...prev }
          delete newNotes[position.id]
          return newNotes
        })
        
        // Refresh positions to show updated status
        setTimeout(() => {
          fetchData()
          setSuccess('')
        }, 2000)
      } else {
        setError(data.error || 'Failed to submit count')
      }
    } catch (err) {
      setError('Error submitting count')
      console.error('Error:', err)
    } finally {
      setSubmittingPositions(prev => {
        const newSet = new Set(prev)
        newSet.delete(position.id)
        return newSet
      })
    }
  }

  const deleteCount = async (position: Position) => {
    if (!confirm(`Are you sure you want to delete the count for ${position.name}? This will reset it to blank.`)) {
      return
    }

    try {
      setSubmittingPositions(prev => new Set(prev).add(position.id))
      setError('')
      
      const response = await fetch(`/api/events/${eventId}/count-sessions/${sessionId}/counts/${position.id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess(`Count deleted for ${position.name}!`)
        
        // Refresh positions to show updated status
        setTimeout(() => {
          fetchData()
          setSuccess('')
        }, 1500)
      } else {
        setError(data.error || 'Failed to delete count')
      }
    } catch (err) {
      setError('Error deleting count')
      console.error('Error:', err)
    } finally {
      setSubmittingPositions(prev => {
        const newSet = new Set(prev)
        newSet.delete(position.id)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <EventLayout 
        title="Enter Count"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: event?.name || 'Loading...', href: `/events/${eventId}` },
          { label: 'Count Times', href: `/events/${eventId}/count-times` },
          { label: 'Enter Count' }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading...</p>
        </div>
      </EventLayout>
    )
  }

  if (error && !event) {
    return (
      <EventLayout title="Error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">Error loading page</p>
        </div>
      </EventLayout>
    )
  }

  return (
    <EventLayout 
      title="Enter Count"
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event?.name || '', href: `/events/${eventId}` },
        { label: 'Count Times', href: `/events/${eventId}/count-times` },
        { label: countSession?.sessionName || 'Enter Count' }
      ]}
      selectedEvent={{
        id: event?.id || '',
        name: event?.name || ''
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enter Attendance Count</h1>
          <p className="text-gray-600">
            Count Session: <span className="font-semibold">{countSession?.sessionName}</span>
          </p>
          <p className="text-sm text-gray-500">
            {countSession && new Date(countSession.countTime).toLocaleString()}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {positions.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assigned Positions</h3>
            <p className="text-gray-600">
              You are not assigned to any positions for this event, so you cannot enter counts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Enter counts for each position below. You can submit them individually.
            </p>
            
            {positions.map((position) => (
              <div
                key={position.id}
                className={`bg-white border rounded-lg p-4 shadow-sm ${
                  position.hasSubmitted
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Position Info */}
                  <div className="flex-shrink-0">
                    <h4 className="font-medium text-gray-900">{position.name}</h4>
                    {position.area && <p className="text-sm text-gray-600">{position.area}</p>}
                    <p className="text-xs text-gray-500">Position #{position.positionNumber}</p>
                  </div>

                  {/* Count Entry or Status */}
                  <div className="flex-grow md:max-w-md">
                    {position.hasSubmitted && !submittingPositions.has(position.id) && !positionCounts[position.id] ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-200">
                          <div>
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              ✓ Submitted
                            </span>
                            {position.currentCount !== undefined && (
                              <p className="text-sm text-gray-700 mt-1 font-semibold">
                                Count: {position.currentCount}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setPositionCounts(prev => ({
                                  ...prev,
                                  [position.id]: position.currentCount?.toString() || ''
                                }))
                              }}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteCount(position)}
                              disabled={submittingPositions.has(position.id)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            value={positionCounts[position.id] || ''}
                            onChange={(e) => setPositionCounts(prev => ({
                              ...prev,
                              [position.id]: e.target.value
                            }))}
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter count"
                            disabled={submittingPositions.has(position.id)}
                          />
                          <button
                            onClick={() => submitCount(position)}
                            disabled={submittingPositions.has(position.id) || !positionCounts[position.id] || positionCounts[position.id].trim() === ''}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                          >
                            {submittingPositions.has(position.id) ? '...' : position.hasSubmitted ? 'Update' : 'Submit'}
                          </button>
                          {position.hasSubmitted && positionCounts[position.id] && (
                            <button
                              onClick={() => {
                                setPositionCounts(prev => {
                                  const newCounts = { ...prev }
                                  delete newCounts[position.id]
                                  return newCounts
                                })
                                setPositionNotes(prev => {
                                  const newNotes = { ...prev }
                                  delete newNotes[position.id]
                                  return newNotes
                                })
                              }}
                              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={positionNotes[position.id] || ''}
                          onChange={(e) => setPositionNotes(prev => ({
                            ...prev,
                            [position.id]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Notes (optional)"
                          disabled={submittingPositions.has(position.id)}
                        />
                      </div>
                    )}
                  </div>
                </div>
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

  // CRITICAL: Block attendants from accessing admin pages
  if (session.user?.role === 'ATTENDANT') {
    return {
      redirect: {
        destination: '/attendant/dashboard',
        permanent: false,
      },
    }
  }

  // Check event-specific permissions - entering counts requires at least OVERSEER
  const { id } = context.params!
  const { canManageAttendants } = await import('../../../../../src/lib/eventAccess')
  const userId = session.user?.id || ''
  const canManageContent = await canManageAttendants(userId, id as string)
  
  if (!canManageContent) {
    // User doesn't have permission to enter counts for this event
    return {
      redirect: {
        destination: `/events/${id}/count-times`,
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}
