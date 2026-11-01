import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../api/auth/[...nextauth]'
import EventLayout from '../../../../../components/EventLayout'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import CountSubmissionSummaries from '../../../../../components/CountSubmissionSummaries'
import { countSessionProgress } from '@/lib/countSessionReporting'
import type {
  GroupSubmissionSummary,
  UngroupedPositionSubmission
} from '@/lib/countSessionSubmissionSummaries'
interface PositionCount {
  id: string
  attendeeCount: number | null
  notes?: string
  countedBy?: string
  countedAt: string
  position: {
    id: string
    positionNumber: number
    name: string
    area: string
  }
}

interface CountSession {
  id: string
  sessionName: string
  countTime: string
  notes?: string
  status: string
  isActive: boolean
  position_counts: PositionCount[]
  /** Populated by GET count-session API — includes station-group totals */
  reportedAttendeeTotal?: number
  reportingSlots?: number
  groupSubmissionSummaries?: GroupSubmissionSummary[]
  ungroupedPositionSubmissions?: UngroupedPositionSubmission[]
}

interface Event {
  id: string
  name: string
}

export default function CountSessionDetailPage() {
  const router = useRouter()
  const { id: eventId, sessionId } = router.query
  const [event, setEvent] = useState<Event | null>(null)
  const [countSession, setCountSession] = useState<CountSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submissionDetailsOpen, setSubmissionDetailsOpen] = useState(false)
  const submissionSectionRef = useRef<HTMLDivElement>(null)

  const toggleSubmissionDetails = () => {
    setSubmissionDetailsOpen((open) => {
      const next = !open
      if (next) {
        requestAnimationFrame(() => {
          submissionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      return next
    })
  }

  const onStatCardKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleSubmissionDetails()
    }
  }

  useEffect(() => {
    if (eventId && sessionId) {
      fetchData()
    }
  }, [eventId, sessionId])

  useEffect(() => {
    if (router.query.submissions === '1' || router.query.submissions === 'open') {
      setSubmissionDetailsOpen(true)
    }
  }, [router.query.submissions])

  const fetchData = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoading(true)
      
      const [eventRes, sessionRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}`)
      ])
      
      const [eventData, sessionData] = await Promise.all([
        eventRes.json(),
        sessionRes.json()
      ])
      
      if (eventData.success) setEvent(eventData.data)
      if (sessionData.success) setCountSession(sessionData.data)
      
      if (!options?.silent && (!eventData.success || !sessionData.success)) {
        setError('Failed to load data')
      }
    } catch (err) {
      if (!options?.silent) setError('Error loading data')
      console.error('Error:', err)
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }

  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  useEffect(() => {
    if (!eventId || !sessionId) return
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void fetchDataRef.current({ silent: true })
    }, 15000)
    return () => window.clearInterval(intervalId)
  }, [eventId, sessionId])

  const calculateStats = () => {
    if (!countSession) return { total: 0, counted: 0, pending: 0 }
    return countSessionProgress({
      groups: countSession.groupSubmissionSummaries ?? [],
      ungrouped: countSession.ungroupedPositionSubmissions ?? [],
      positionCounts: countSession.position_counts,
    })
  }

  const calculateTotalAttendees = () => {
    if (!countSession) return 0
    if (typeof countSession.reportedAttendeeTotal === 'number') {
      return countSession.reportedAttendeeTotal
    }
    return countSession.position_counts.reduce((sum, pc) => sum + (pc.attendeeCount || 0), 0)
  }

  const groupByDepartment = () => {
    if (!countSession) return {}
    
    const grouped: Record<string, PositionCount[]> = {}
    
    countSession.position_counts.forEach(pc => {
      const dept = pc.position.area || 'Unassigned'
      if (!grouped[dept]) grouped[dept] = []
      grouped[dept].push(pc)
    })
    
    return grouped
  }

  if (loading) {
    return (
      <EventLayout 
        title="Count Session Details"
        breadcrumbs={[
          { label: 'Events', href: '/events' },
          { label: event?.name || 'Loading...', href: `/events/${eventId}` },
          { label: 'Count Times', href: `/events/${eventId}/count-times` },
          { label: 'Details' }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading...</p>
        </div>
      </EventLayout>
    )
  }

  if (error || !event || !countSession) {
    return (
      <EventLayout title="Error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <p className="text-red-700">{error || 'Failed to load count session'}</p>
          <Link
            href={`/events/${eventId}/count-times`}
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ← Back to Count Times
          </Link>
        </div>
      </EventLayout>
    )
  }

  const stats = calculateStats()
  const totalAttendees = calculateTotalAttendees()
  const departmentGroups = groupByDepartment()

  return (
    <EventLayout 
      title="Count Session Details"
      breadcrumbs={[
        { label: 'Events', href: '/events' },
        { label: event.name, href: `/events/${eventId}` },
        { label: 'Count Times', href: `/events/${eventId}/count-times` },
        { label: countSession.sessionName }
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
              <h1 className="text-2xl font-bold text-gray-900">{countSession.sessionName}</h1>
              <p className="text-gray-600">
                Count Time: {(() => {
                  const date = new Date(countSession.countTime)
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  const hours = String(date.getHours()).padStart(2, '0')
                  const minutes = String(date.getMinutes()).padStart(2, '0')
                  return `${month}/${day}/${year} ${hours}:${minutes}`
                })()}
              </p>
              {countSession.notes && (
                <p className="text-sm text-gray-500 mt-1">{countSession.notes}</p>
              )}
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/events/${eventId}/count-times`}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ← Back to Count Times
              </Link>
              <Link
                href={`/events/${eventId}/count-times/${sessionId}/enter-count`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                📝 Enter Counts
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards — click to expand/collapse recorded submissions */}
        <p className="text-sm text-gray-500 mb-3">
          Click any summary card to show or hide the submission breakdown (groups and individual stations).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            type="button"
            onClick={toggleSubmissionDetails}
            onKeyDown={onStatCardKeyDown}
            className={`bg-white shadow rounded-lg p-6 text-left w-full transition-all hover:shadow-md hover:ring-2 hover:ring-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              submissionDetailsOpen ? 'ring-2 ring-blue-300' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attendees</p>
                <p className="text-3xl font-bold text-blue-600">{totalAttendees}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleSubmissionDetails}
            onKeyDown={onStatCardKeyDown}
            className={`bg-white shadow rounded-lg p-6 text-left w-full transition-all hover:shadow-md hover:ring-2 hover:ring-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 ${
              submissionDetailsOpen ? 'ring-2 ring-green-300' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Positions / groups counted</p>
                <p className="text-3xl font-bold text-green-600">{stats.counted}</p>
                <p className="text-xs text-gray-400 mt-1">Each group counts as one slot</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleSubmissionDetails}
            onKeyDown={onStatCardKeyDown}
            className={`bg-white shadow rounded-lg p-6 text-left w-full transition-all hover:shadow-md hover:ring-2 hover:ring-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 ${
              submissionDetailsOpen ? 'ring-2 ring-yellow-300' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleSubmissionDetails}
            onKeyDown={onStatCardKeyDown}
            className={`bg-white shadow rounded-lg p-6 text-left w-full transition-all hover:shadow-md hover:ring-2 hover:ring-purple-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
              submissionDetailsOpen ? 'ring-2 ring-purple-300' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </button>
        </div>

        <div ref={submissionSectionRef} className="mb-8 rounded-xl border border-gray-200 bg-gray-50/80 overflow-hidden scroll-mt-4">
          <button
            type="button"
            onClick={toggleSubmissionDetails}
            className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recorded submissions</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {submissionDetailsOpen ? 'Hide tables' : 'Expand to see each group and station entry'}
              </p>
            </div>
            <span className="text-gray-400 text-2xl shrink-0" aria-hidden>
              {submissionDetailsOpen ? '▾' : '▸'}
            </span>
          </button>
          {submissionDetailsOpen && (
            <div className="p-4 md:p-6 bg-white">
              <CountSubmissionSummaries
                groups={countSession.groupSubmissionSummaries ?? []}
                ungroupedPositions={countSession.ungroupedPositionSubmissions ?? []}
              />
            </div>
          )}
        </div>

        {/* Counts by Department */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">By department (per station)</h2>
          {Object.entries(departmentGroups).map(([department, positions]) => {
            const deptTotal = positions.reduce((sum, pc) => sum + (pc.attendeeCount || 0), 0)
            const deptCounted = positions.filter(pc => pc.attendeeCount !== null).length
            
            return (
              <div key={department} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{department}</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {deptCounted}/{positions.length} positions counted
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {deptTotal} attendees
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Counted At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {positions
                        .sort((a, b) => a.position.positionNumber - b.position.positionNumber)
                        .map((pc) => (
                          <tr key={pc.id} className={pc.attendeeCount === null ? 'bg-yellow-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {pc.position.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Position #{pc.position.positionNumber}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {pc.attendeeCount !== null ? (
                                <span className="text-2xl font-bold text-blue-600">
                                  {pc.attendeeCount}
                                </span>
                              ) : (
                                <span className="text-sm text-yellow-600 font-medium">
                                  Not counted
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {pc.notes || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {pc.attendeeCount !== null ? (() => {
                                const date = new Date(pc.countedAt)
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                const hours = String(date.getHours()).padStart(2, '0')
                                const minutes = String(date.getMinutes()).padStart(2, '0')
                                return `${month}/${day}/${year} ${hours}:${minutes}`
                              })() : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>

        {/* Export/Print Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => window.print()}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            🖨️ Print Report
          </button>
          <button
            onClick={() => {
              const csv = generateCSV()
              downloadCSV(csv, `count-session-${countSession.sessionName}.csv`)
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            📥 Export CSV
          </button>
        </div>
      </div>
    </EventLayout>
  )

  function generateCSV(): string {
    if (!countSession) return ''

    const esc = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`

    const sections: string[] = []

    const gs = countSession.groupSubmissionSummaries ?? []
    if (gs.length > 0) {
      sections.push(
        ['Type', 'Name', 'Stations', 'Attendee Count', 'Notes', 'Submitted by', 'Submitted at'].join(',')
      )
      for (const g of gs) {
        sections.push(
          [
            esc('Station group'),
            esc(g.groupName),
            esc(g.stationsLabel),
            esc(g.attendeeCount ?? ''),
            esc(g.notes ?? ''),
            esc(g.submittedBy ?? ''),
            esc(g.submittedAt ?? '')
          ].join(',')
        )
      }
      sections.push('')
    }

    const headers = [
      'Type',
      'Position Number',
      'Position Name',
      'Department',
      'Attendee Count',
      'Notes',
      'Submitted by',
      'Counted At'
    ]
    const ungrouped = countSession.ungroupedPositionSubmissions ?? []
    const positionRowsFromSession = countSession.position_counts
      .sort((a, b) => a.position.positionNumber - b.position.positionNumber)
      .map((pc) => [
        esc('Individual station'),
        esc(pc.position.positionNumber),
        esc(pc.position.name),
        esc(pc.position.area),
        esc(pc.attendeeCount ?? 'Not counted'),
        esc(pc.notes || ''),
        esc(
          ungrouped.find((u) => u.positionId === pc.position.id)?.submittedBy ??
            ''
        ),
        esc(
          pc.attendeeCount !== null
            ? (() => {
                const date = new Date(pc.countedAt)
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                const hours = String(date.getHours()).padStart(2, '0')
                const minutes = String(date.getMinutes()).padStart(2, '0')
                return `${month}/${day}/${year} ${hours}:${minutes}`
              })()
            : ''
        )
      ])

    sections.push(headers.join(','))
    sections.push(...positionRowsFromSession.map((row) => row.join(',')))

    return sections.join('\n')
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }
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
