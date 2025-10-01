import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]'
import EventLayout from '../../../../../components/EventLayout'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface PositionCount {
  id: string
  attendeeCount: number | null
  notes?: string
  countedBy?: string
  countedAt: string
  event_positions: {
    id: string
    positionNumber: number
    positionName: string
    department: string
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

  useEffect(() => {
    if (eventId && sessionId) {
      fetchData()
    }
  }, [eventId, sessionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
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
      
      if (!eventData.success || !sessionData.success) {
        setError('Failed to load data')
      }
    } catch (err) {
      setError('Error loading data')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    if (!countSession) return { total: 0, counted: 0, pending: 0 }
    
    const counted = countSession.position_counts.filter(pc => pc.attendeeCount !== null).length
    const total = countSession.position_counts.length
    const pending = total - counted
    
    return { total, counted, pending }
  }

  const calculateTotalAttendees = () => {
    if (!countSession) return 0
    return countSession.position_counts.reduce((sum, pc) => sum + (pc.attendeeCount || 0), 0)
  }

  const groupByDepartment = () => {
    if (!countSession) return {}
    
    const grouped: Record<string, PositionCount[]> = {}
    
    countSession.position_counts.forEach(pc => {
      const dept = pc.event_positions.department || 'Unassigned'
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
                Count Time: {new Date(countSession.countTime).toLocaleString()}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attendees</p>
                <p className="text-3xl font-bold text-blue-600">{totalAttendees}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Positions Counted</p>
                <p className="text-3xl font-bold text-green-600">{stats.counted}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Counts</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0}%
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>

        {/* Counts by Department */}
        <div className="space-y-6">
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
                        .sort((a, b) => a.event_positions.positionNumber - b.event_positions.positionNumber)
                        .map((pc) => (
                          <tr key={pc.id} className={pc.attendeeCount === null ? 'bg-yellow-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {pc.event_positions.positionName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Position #{pc.event_positions.positionNumber}
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
                              {pc.attendeeCount !== null ? (
                                new Date(pc.countedAt).toLocaleString()
                              ) : (
                                '-'
                              )}
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
    
    const headers = ['Position Number', 'Position Name', 'Department', 'Attendee Count', 'Notes', 'Counted At']
    const rows = countSession.position_counts
      .sort((a, b) => a.event_positions.positionNumber - b.event_positions.positionNumber)
      .map(pc => [
        pc.event_positions.positionNumber,
        pc.event_positions.positionName,
        pc.event_positions.department,
        pc.attendeeCount ?? 'Not counted',
        pc.notes || '',
        pc.attendeeCount !== null ? new Date(pc.countedAt).toLocaleString() : ''
      ])
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
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
