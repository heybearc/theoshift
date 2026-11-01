import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../api/auth/[...nextauth]'
import EventLayout from '../../../../../components/EventLayout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import {
  canSimulateVolunteerRole,
  getViewAsHeaders,
  getViewAsVolunteerId,
  setViewAsVolunteerId,
} from '@/lib/viewAsClient'
import CountSubmissionSummaries from '../../../../../components/CountSubmissionSummaries'
import { appConfirm, appConfirmMessage } from '../../../../../lib/ui/confirm'
import type {
  GroupSubmissionSummary,
  UngroupedPositionSubmission
} from '@/lib/countSessionSubmissionSummaries'

interface Position {
  id: string
  positionNumber: number
  name: string
  description?: string
  area?: string
  currentCount?: number
  hasSubmitted?: boolean
}

interface CountGroup {
  id: string
  name: string
  positionIds: string[]
  primaryVolunteerId?: string | null
  secondaryVolunteerId?: string | null
  primaryName?: string | null
  secondaryName?: string | null
  entry?: { attendeeCount: number | null; notes?: string | null } | null
}

interface CountSession {
  id: string
  sessionName: string
  countTime: string
  status: string
  groupSubmissionSummaries?: GroupSubmissionSummary[]
  ungroupedPositionSubmissions?: UngroupedPositionSubmission[]
}

interface Event {
  id: string
  name: string
}

export default function EnterCountPage({ canReviseCounts = false }: { canReviseCounts?: boolean }) {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { id: eventId, sessionId } = router.query
  const viewAsVolunteerIdFromQuery =
    typeof router.query.viewAsVolunteerId === 'string' ? router.query.viewAsVolunteerId : null
  const [event, setEvent] = useState<Event | null>(null)
  const [countSession, setCountSession] = useState<CountSession | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [groups, setGroups] = useState<CountGroup[]>([])
  const [positionCounts, setPositionCounts] = useState<Record<string, string>>({}) // Track count per position
  const [positionNotes, setPositionNotes] = useState<Record<string, string>>({}) // Track notes per position
  const [submittingPositions, setSubmittingPositions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const userRole = session?.user?.role || ''
  const isPrivilegedCounter = ['ADMIN', 'OVERSEER', 'KEYMAN'].includes(userRole)

  const viewAsVid =
    viewAsVolunteerIdFromQuery || (typeof window !== 'undefined' ? getViewAsVolunteerId() : null)
  const privilegedCounterView = isPrivilegedCounter && !viewAsVid
  const canEditSubmitted = canReviseCounts && !viewAsVid
  const effectiveVolunteerIdForCounts = viewAsVid || session?.user?.id || ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!canSimulateVolunteerRole(session?.user?.role)) {
      return
    }
    if (viewAsVolunteerIdFromQuery) {
      setViewAsVolunteerId(viewAsVolunteerIdFromQuery)
    }
  }, [session?.user?.role, viewAsVolunteerIdFromQuery])

  useEffect(() => {
    // Wait until auth state resolves so role-based filtering is correct for admins.
    if (sessionStatus === 'loading') return
    if (eventId && sessionId) {
      fetchData()
    }
  }, [
    eventId,
    sessionId,
    sessionStatus,
    userRole,
    session?.user?.id,
    viewAsVolunteerIdFromQuery,
  ])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch event, count session, positions, and existing counts
      const viewAsHeaders = getViewAsHeaders()
      const [eventRes, sessionRes, positionsRes, countsRes, assigneesRes, groupsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`, { headers: viewAsHeaders }),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}`, { headers: viewAsHeaders }),
        fetch(`/api/events/${eventId}/positions?includeAssignments=true&limit=1000`, { headers: viewAsHeaders }),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}/counts`, { headers: viewAsHeaders }),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}/assignees`, { headers: viewAsHeaders }),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}/groups`, { headers: viewAsHeaders })
      ])
      
      const [eventData, sessionData, positionsData, countsData, assigneesData, groupsData] = await Promise.all([
        eventRes.json(),
        sessionRes.json(),
        positionsRes.json(),
        countsRes.json(),
        assigneesRes.json(),
        groupsRes.json()
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
      
      const rawPositions = positionsData?.data?.positions ?? positionsData?.positions ?? []
      if (positionsData.success && Array.isArray(rawPositions)) {
        // ADMIN, OVERSEER, KEYMAN can see all positions
        // ATTENDANT can only see positions they're assigned to
        const allPositions = rawPositions.map((pos: any) => {
          const existingCount = countsByPosition.get(pos.id)
          return {
            ...pos,
            hasSubmitted: !!existingCount,
            currentCount: existingCount?.attendeeCount
          }
        })
        
        if (privilegedCounterView) {
          // Show all positions for admin roles
          setPositions(allPositions)
        } else {
          const assignedIds = new Set(
            ((assigneesData?.data?.positions || []) as any[]).map((position) => position.id)
          )
          // Filter positions that the current volunteer is explicitly assigned to for this count session.
          const userPositions = allPositions.filter((pos: any) => assignedIds.has(pos.id))
          // Optional transition fallback to legacy position assignments if no explicit assignees exist.
          const fallbackPositions = userPositions.length > 0 || process.env.NEXT_PUBLIC_COUNT_ASSIGNMENTS_FALLBACK !== 'true'
            ? userPositions
            : allPositions.filter((pos: any) =>
                pos.assignments?.some((assignment: any) =>
                  assignment.volunteerId === effectiveVolunteerIdForCounts ||
                  assignment.attendantId === effectiveVolunteerIdForCounts
                )
              )
          setPositions(fallbackPositions)
        }
      }

      if (groupsData?.success && Array.isArray(groupsData?.data?.groups)) {
        const allGroups: CountGroup[] = groupsData.data.groups
        if (privilegedCounterView) {
          setGroups(allGroups)
        } else {
          setGroups(
            allGroups.filter(
              (group) =>
                group.primaryVolunteerId === effectiveVolunteerIdForCounts ||
                group.secondaryVolunteerId === effectiveVolunteerIdForCounts
            )
          )
        }
      } else {
        setGroups([])
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
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
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

  const submitGroupCount = async (group: CountGroup) => {
    const countValue = positionCounts[group.id]
    if (!countValue || countValue.trim() === '') {
      setError('Please enter a count for this group')
      return
    }

    const count = parseInt(countValue)
    if (isNaN(count) || count < 0) {
      setError('Please enter a valid number')
      return
    }

    try {
      setSubmittingPositions(prev => new Set(prev).add(group.id))
      setError('')

      const response = await fetch(`/api/events/${eventId}/count-sessions/${sessionId}/counts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({
          groupId: group.id,
          attendeeCount: count,
          notes: positionNotes[group.id]?.trim() || undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccess(`Count submitted for ${group.name}!`)
        setTimeout(() => {
          fetchData()
          setSuccess('')
        }, 1200)
      } else {
        setError(data.error || 'Failed to submit group count')
      }
    } catch (err) {
      setError('Error submitting group count')
      console.error('Error:', err)
    } finally {
      setSubmittingPositions(prev => {
        const next = new Set(prev)
        next.delete(group.id)
        return next
      })
    }
  }

  const deleteCount = async (position: Position) => {
    if (!(await appConfirmMessage(`Are you sure you want to delete the count for ${position.name}? This will reset it to blank.`))) {
      return
    }

    try {
      setSubmittingPositions(prev => new Set(prev).add(position.id))
      setError('')
      
      const response = await fetch(`/api/events/${eventId}/count-sessions/${sessionId}/counts/${position.id}`, {
        method: 'DELETE',
        headers: { ...getViewAsHeaders() }
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
            {countSession && (() => {
              const date = new Date(countSession.countTime)
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              const hours = String(date.getHours()).padStart(2, '0')
              const minutes = String(date.getMinutes()).padStart(2, '0')
              return `${month}/${day}/${year} ${hours}:${minutes}`
            })()}
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

        {privilegedCounterView && countSession && (
          <div className="mb-8 max-w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 text-left">Recorded submissions</h2>
            <CountSubmissionSummaries
              compact
              groups={countSession.groupSubmissionSummaries ?? []}
              ungroupedPositions={countSession.ungroupedPositionSubmissions ?? []}
            />
          </div>
        )}

        {groups.length > 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              This session uses grouped count entry. Primary or secondary counter for the group can submit one agreed count.
            </p>
          </div>
        ) : null}

        {positions.length === 0 && groups.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assigned Positions</h3>
            <p className="text-gray-600">
              {privilegedCounterView
                ? 'No positions are configured for this event yet.'
                : 'You are not assigned to take counts for this session.'}
            </p>
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => {
              const groupSubmitted = group.entry != null
              const groupLocked = groupSubmitted && !canEditSubmitted
              return (
              <div key={group.id} className={`rounded-lg p-4 shadow-sm border ${groupLocked ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}>
                <h4 className={`font-medium ${groupLocked ? 'text-gray-600' : 'text-gray-900'}`}>{group.name}</h4>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="text-gray-500">Primary counter:</span>{' '}
                  <span className="font-medium">{group.primaryName || '—'}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-500">Secondary:</span>{' '}
                  <span className="font-medium">{group.secondaryName || '—'}</span>
                </p>
                <p className="text-xs text-gray-500 mb-2 mt-2">Stations in group: {group.positionIds.length}</p>
                {groupLocked ? (
                  <div className="rounded-lg border border-gray-300 bg-gray-200 p-3">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-300 text-gray-700 rounded-full">
                      Submitted
                    </span>
                    <p className="text-sm font-semibold text-gray-600 mt-2">
                      Count: {group.entry?.attendeeCount ?? '—'}
                    </p>
                    {group.entry?.notes ? (
                      <p className="text-sm text-gray-600 mt-1">Notes: {group.entry.notes}</p>
                    ) : null}
                    <p className="text-sm text-gray-500 mt-2">An overseer or event staff can change this count.</p>
                  </div>
                ) : (
                <>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={positionCounts[group.id] || ''}
                    onChange={(e) => setPositionCounts(prev => ({ ...prev, [group.id]: e.target.value }))}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter agreed count"
                    disabled={submittingPositions.has(group.id)}
                  />
                  <button
                    onClick={() => submitGroupCount(group)}
                    disabled={submittingPositions.has(group.id) || !positionCounts[group.id]}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                  >
                    {submittingPositions.has(group.id) ? '...' : 'Submit'}
                  </button>
                </div>
                <input
                  type="text"
                  value={positionNotes[group.id] || ''}
                  onChange={(e) => setPositionNotes(prev => ({ ...prev, [group.id]: e.target.value }))}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Notes (optional)"
                />
                </>
                )}
              </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Enter counts for each position below. You can submit them individually.
            </p>
            
            {positions.map((position) => (
              <div
                key={position.id}
                className={`border rounded-lg p-4 shadow-sm ${
                  position.hasSubmitted && !canEditSubmitted
                    ? 'border-gray-300 bg-gray-100'
                    : position.hasSubmitted
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white'
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
                        <div className={`flex items-center justify-between rounded-lg p-3 border ${canEditSubmitted ? 'bg-white border-green-200' : 'bg-gray-200 border-gray-300'}`}>
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${canEditSubmitted ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-700'}`}>
                              Submitted
                            </span>
                            {position.currentCount !== undefined && (
                              <p className="text-sm text-gray-700 mt-1 font-semibold">
                                Count: {position.currentCount}
                              </p>
                            )}
                          </div>
                          {canEditSubmitted ? (
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
                              Delete
                            </button>
                          </div>
                          ) : (
                            <p className="text-sm text-gray-500 max-w-[12rem] text-right">An overseer or event staff can change this count.</p>
                          )}
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

  // Check event-specific permissions - privileged users require management access.
  const { id } = context.params!
  const { canManageAttendants } = await import('../../../../../src/lib/eventAccess')
  const userId = session.user?.id || ''
  if (session.user?.role !== 'VOLUNTEER') {
    const canManageContent = await canManageAttendants(userId, id as string)
    if (!canManageContent) {
      return {
        redirect: {
          destination: `/events/${id}/count-times`,
          permanent: false,
        },
      }
    }
  }

  if (!session.user?.id) {
    // User doesn't have permission to enter counts for this event
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  const { canReviseSubmittedCount } = await import('../../../../../src/lib/countAssignments')
  const canReviseCounts = await canReviseSubmittedCount(
    userId,
    session.user?.role || '',
    id as string
  )

  return {
    props: { canReviseCounts },
  }
}
