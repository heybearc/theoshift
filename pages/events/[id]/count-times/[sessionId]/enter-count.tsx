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
  title: string
  department: string
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
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [attendeeCount, setAttendeeCount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
      
      // Fetch event, count session, and available positions
      const [eventRes, sessionRes, positionsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}`),
        fetch(`/api/events/${eventId}/positions`)
      ])
      
      const [eventData, sessionData, positionsData] = await Promise.all([
        eventRes.json(),
        sessionRes.json(),
        positionsRes.json()
      ])
      
      if (eventData.success) setEvent(eventData.data)
      if (sessionData.success) setCountSession(sessionData.data)
      if (positionsData.success) {
        // Filter positions that the current user is assigned to
        const userPositions = positionsData.data.filter((pos: any) => 
          pos.assignments.some((assignment: any) => 
            assignment.userId === session?.user?.id
          )
        )
        setPositions(userPositions)
      }
      
    } catch (err) {
      setError('Error loading data')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const submitCount = async () => {
    if (!selectedPosition || !attendeeCount) {
      setError('Please select a position and enter a count')
      return
    }

    const count = parseInt(attendeeCount)
    if (isNaN(count) || count < 0) {
      setError('Please enter a valid number')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      
      const response = await fetch(`/api/events/${eventId}/count-sessions/${sessionId}/counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: selectedPosition.id,
          attendeeCount: count,
          notes: notes.trim() || undefined
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess('Count submitted successfully!')
        setAttendeeCount('')
        setNotes('')
        setSelectedPosition(null)
        
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
      setSubmitting(false)
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
          <div className="bg-white shadow rounded-lg p-6">
            {/* Position Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Your Position
              </label>
              <div className="grid grid-cols-1 gap-3">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPosition?.id === position.id
                        ? 'border-blue-500 bg-blue-50'
                        : position.hasSubmitted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => !position.hasSubmitted && setSelectedPosition(position)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{position.title}</h4>
                        <p className="text-sm text-gray-600">{position.department}</p>
                        <p className="text-xs text-gray-500">Position #{position.positionNumber}</p>
                      </div>
                      <div className="text-right">
                        {position.hasSubmitted ? (
                          <div>
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              ✓ Submitted
                            </span>
                            {position.currentCount !== undefined && (
                              <p className="text-sm text-gray-600 mt-1">
                                Count: {position.currentCount}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedPosition && !selectedPosition.hasSubmitted && (
              <>
                {/* Count Input */}
                <div className="mb-6">
                  <label htmlFor="attendeeCount" className="block text-sm font-medium text-gray-700 mb-2">
                    Attendee Count for {selectedPosition.title}
                  </label>
                  <input
                    type="number"
                    id="attendeeCount"
                    min="0"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter number of attendees"
                  />
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes about the count..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPosition(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitCount}
                    disabled={submitting || !attendeeCount}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Submit Count'}
                  </button>
                </div>
              </>
            )}
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
