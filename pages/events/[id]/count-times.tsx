import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import EventPageWrapper from '../../../components/EventPageWrapper'
import CreateCountSessionModal from '../../../components/CreateCountSessionModal'
import EditCountSessionModal from '../../../components/EditCountSessionModal'
import { useEffect, useState } from 'react'
import { useShiftRangeSelection } from '../../../hooks/useShiftRangeSelection'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { getViewAsHeaders } from '@/lib/viewAsClient'
import { appConfirm, appConfirmMessage } from '../../../lib/ui/confirm'

// Client-side only date formatter to avoid hydration errors
function ClientDate({ isoString }: { isoString: string }) {
  const [formatted, setFormatted] = useState('')
  
  useEffect(() => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    setFormatted(`${month}/${day}/${year} ${hours}:${minutes}`)
  }, [isoString])
  
  return <>{formatted || 'Loading...'}</>
}

interface CountSession {
  id: string
  sessionName: string
  countTime: string
  notes?: string
  status: string
  isActive: boolean
  createdAt: string
  /** Includes station-group totals (count_group_entries), not only position_counts */
  reportedTotalAttendees: number
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
  status: string
  eventType: string
  startDate: string
}

interface CountStats {
  total: number
  active: number
  completed: number
}

interface VolunteerOption {
  id: string
  name: string
}

interface SessionAssignmentPosition {
  id: string
  name: string
  positionNumber: number
  area?: string
  suggestedVolunteerId?: string | null
  candidateVolunteers?: Array<{
    id: string
    name: string
    congregation?: string
  }>
  assignees: Array<{
    volunteerId: string
    isSuggested: boolean
  }>
}

interface CountGroupDraft {
  id?: string
  name: string
  primaryVolunteerId?: string
  secondaryVolunteerId?: string
  positionIds: string[]
}

interface CountTimesPageProps {
  eventId: string
  event: Event
  countSessions: CountSession[]
  canManageContent: boolean
  canEdit: boolean
  canDelete: boolean
  canManagePermissions: boolean
  stats: CountStats
  moduleConfig?: any
  terminology?: any
}

export default function CountTimesPage({ eventId, event, countSessions, canManageContent, canEdit, canDelete, canManagePermissions, stats, moduleConfig, terminology }: CountTimesPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSession, setEditingSession] = useState<CountSession | null>(null)
  const [assignmentSessionId, setAssignmentSessionId] = useState<string | null>(null)
  const [assignmentPositions, setAssignmentPositions] = useState<SessionAssignmentPosition[]>([])
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([])
  const [selectedBulkVolunteerId, setSelectedBulkVolunteerId] = useState('')
  const [selectedBulkPositions, setSelectedBulkPositions] = useState<Set<string>>(new Set())
  const stationRange = useShiftRangeSelection()
  const [savingAssignments, setSavingAssignments] = useState(false)
  const [groupDrafts, setGroupDrafts] = useState<CountGroupDraft[]>([])
  const [groupSaveMessage, setGroupSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // APEX GUARDIAN: Client-side fetching removed - data now provided via SSR

  const toggleSessionActive = async (sessionId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}/count-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ isActive: !currentActive })
      })
      
      if (!response.ok) {
        throw new Error('Failed to toggle session status')
      }
      
      router.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const deleteCountSession = async (sessionId: string, sessionName: string) => {
    if (!(await appConfirmMessage(`Are you sure you want to delete "${sessionName}"? This action cannot be undone.`))) {
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/count-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { ...getViewAsHeaders() }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete count session')
      }
      
      router.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const createCountSession = async (data: { sessionName: string; countTime: string; notes?: string }) => {
    const response = await fetch(`/api/events/${eventId}/count-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create count session')
    }
    
    router.reload() // Refresh page to show updated data
  }

  const openAssignmentManager = async (sessionId: string) => {
    setError('')
    setGroupSaveMessage(null)
    setAssignmentSessionId(sessionId)
    setSelectedBulkPositions(new Set())
    setSelectedBulkVolunteerId('')
    try {
      const [assigneesRes, volunteersRes, groupsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}/assignees`, { headers: { ...getViewAsHeaders() } }),
        fetch(`/api/events/${eventId}/volunteers`, { headers: { ...getViewAsHeaders() } }),
        fetch(`/api/events/${eventId}/count-sessions/${sessionId}/groups`, { headers: { ...getViewAsHeaders() } })
      ])

      const [assigneesData, volunteersData, groupsData] = await Promise.all([assigneesRes.json(), volunteersRes.json(), groupsRes.json()])
      if (!assigneesData.success) throw new Error(assigneesData.error || 'Failed loading assignments')
      if (!volunteersData.success) throw new Error(volunteersData.error || 'Failed loading volunteers')

      setAssignmentPositions((assigneesData.data?.positions || []).map((position: any) => ({
        id: position.id,
        name: position.name,
        positionNumber: position.positionNumber,
        area: position.area || '',
        suggestedVolunteerId: position.suggestedVolunteerId || null,
        candidateVolunteers: position.candidateVolunteers || [],
        assignees: ((position.assignees && position.assignees.length > 0)
          ? position.assignees
          : (position.suggestedVolunteerId ? [{ volunteerId: position.suggestedVolunteerId, isSuggested: true }] : [])
        ).map((a: any) => ({
          volunteerId: a.volunteerId,
          isSuggested: !!a.isSuggested
        }))
      })))
      setVolunteers((volunteersData.volunteers || []).map((v: any) => ({ id: v.id, name: v.name })))
      setGroupDrafts((groupsData?.data?.groups || []).map((group: any) => ({
        id: group.id,
        name: group.name,
        primaryVolunteerId: group.primaryVolunteerId || '',
        secondaryVolunteerId: group.secondaryVolunteerId || '',
        positionIds: group.positionIds || []
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open assignment manager')
    }
  }

  const saveAssignments = async () => {
    if (!assignmentSessionId) return
    setSavingAssignments(true)
    try {
      const payload = {
        assignees: assignmentPositions.map((position) => ({
          positionId: position.id,
          volunteerIds: position.assignees.map((a) => a.volunteerId)
        }))
      }
      const response = await fetch(`/api/events/${eventId}/count-sessions/${assignmentSessionId}/assignees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save assignments')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assignments')
    } finally {
      setSavingAssignments(false)
    }
  }

  const applySuggestions = async () => {
    if (!assignmentSessionId) return
    try {
      const response = await fetch(`/api/events/${eventId}/count-sessions/${assignmentSessionId}/assignees/suggestions`, {
        method: 'POST',
        headers: { ...getViewAsHeaders() }
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to apply suggestions')
      await openAssignmentManager(assignmentSessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply suggestions')
    }
  }

  const clearAssignments = () => {
    setAssignmentPositions((prev) => prev.map((position) => ({ ...position, assignees: [] })))
  }

  if (loading || !event) {
    return null
  }

  return (
    <EventPageWrapper
      event={{
        id: event.id,
        name: event.name,
        status: event.status,
        eventType: event.eventType,
        startDate: event.startDate
      }}
      currentPage="count-times"
      canEdit={canEdit}
      canDelete={canDelete}
      canManagePermissions={canManagePermissions}
      moduleConfig={moduleConfig}
      terminology={terminology}
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {countSessions.map((session) => (
              <div key={session.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{session.sessionName}</h3>
                      <p className="text-sm text-gray-600">
                        Count Time: <ClientDate isoString={session.countTime} />
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        session.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      {canManageContent && (
                        <>
                          <button
                            onClick={() => toggleSessionActive(session.id, session.isActive)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              session.isActive
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                            title={session.isActive ? 'Deactivate session' : 'Activate session'}
                          >
                            {session.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                          </button>
                          <button
                            onClick={() => setEditingSession(session)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <Link
                            href={`/events/${eventId}/count-times/${session.id}/enter-count`}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                          >
                            📝 Enter Counts
                          </Link>
                          <button
                            onClick={() => openAssignmentManager(session.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition-colors"
                          >
                            👥 Assign Counters
                          </button>
                          <button
                            onClick={() => deleteCountSession(session.id, session.sessionName)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            title="Delete count session"
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                      <Link
                        href={`/events/${eventId}/count-times/${session.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                  {(session.reportedTotalAttendees > 0 || session.position_counts.length > 0) && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Session Total:</span>
                        <span className="text-2xl font-bold text-green-600">{session.reportedTotalAttendees}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {assignmentSessionId === session.id && (
                  <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50 space-y-4">
                    {groupSaveMessage && (
                      <div className={`rounded p-2 text-sm ${groupSaveMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                        {groupSaveMessage.text}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 items-center">
                      <button onClick={applySuggestions} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Apply Suggestions</button>
                      <button onClick={clearAssignments} className="px-3 py-1 bg-gray-500 text-white rounded text-sm">Clear Assignments</button>
                      <button onClick={saveAssignments} disabled={savingAssignments} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-60">
                        {savingAssignments ? 'Saving...' : 'Save Assignments'}
                      </button>
                      <button onClick={() => setAssignmentSessionId(null)} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm">Close</button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded border border-indigo-100">
                      <select
                        value={selectedBulkVolunteerId}
                        onChange={(e) => setSelectedBulkVolunteerId(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Select volunteer</option>
                        {volunteers.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (!selectedBulkVolunteerId || selectedBulkPositions.size === 0) return
                          setAssignmentPositions((prev) => prev.map((position) => {
                            if (!selectedBulkPositions.has(position.id)) return position
                            const already = position.assignees.some((a) => a.volunteerId === selectedBulkVolunteerId)
                            return already ? position : {
                              ...position,
                              assignees: [...position.assignees, { volunteerId: selectedBulkVolunteerId, isSuggested: false }]
                            }
                          }))
                        }}
                        className="px-3 py-2 bg-indigo-600 text-white rounded text-sm"
                      >
                        Assign Volunteer To Selected Stations
                      </button>
                    </div>

                    {groupDrafts.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                        Groups are active. Station cards below now show group membership so you can verify coverage. Grouping is the source of truth for entry.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {assignmentPositions.map((position, index) => (
                        <div key={position.id} className="bg-white border border-gray-200 rounded p-3">
                          <label className="flex items-center gap-2 mb-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedBulkPositions.has(position.id)}
                              onClick={(e) => stationRange.markClick(e)}
                              onChange={(e) => {
                                const ids = assignmentPositions.map((row) => row.id)
                                const handled = stationRange.consumeRange(e, index, (lo, hi) => {
                                  setSelectedBulkPositions((prev) => {
                                    const next = new Set(prev)
                                    ids.slice(lo, hi + 1).forEach((id) => next.add(id))
                                    return next
                                  })
                                })
                                if (handled) return
                                setSelectedBulkPositions((prev) => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(position.id)
                                  else next.delete(position.id)
                                  return next
                                })
                              }}
                            />
                            #{position.positionNumber} {position.name}
                          </label>
                          {(() => {
                            const owner = groupDrafts.find((group) => group.positionIds.includes(position.id))
                            if (!owner) return null
                            const primaryName = owner.primaryVolunteerId
                              ? (volunteers.find((v) => v.id === owner.primaryVolunteerId)?.name || owner.primaryVolunteerId)
                              : 'Unassigned'
                            const secondaryName = owner.secondaryVolunteerId
                              ? (volunteers.find((v) => v.id === owner.secondaryVolunteerId)?.name || owner.secondaryVolunteerId)
                              : 'Unassigned'
                            return (
                              <div className="mb-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                Grouped in: <span className="font-semibold">{owner.name}</span>
                                <div className="mt-1 text-[11px] leading-4 text-emerald-800">
                                  Primary: <span className="font-semibold">{primaryName}</span> | Secondary: <span className="font-semibold">{secondaryName}</span>
                                </div>
                              </div>
                            )
                          })()}
                          {position.suggestedVolunteerId && (
                            <div className="mb-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1">
                              Suggested from shift/count-time match: {volunteers.find((v) => v.id === position.suggestedVolunteerId)?.name || position.suggestedVolunteerId}
                            </div>
                          )}
                          <select
                            multiple
                            value={position.assignees.map((a) => a.volunteerId)}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions).map((option) => option.value)
                              setAssignmentPositions((prev) => prev.map((current) => current.id === position.id
                                ? { ...current, assignees: selected.map((id) => ({ volunteerId: id, isSuggested: false })) }
                                : current
                              ))
                            }}
                            className="w-full min-h-[100px] border border-gray-300 rounded text-sm"
                          >
                            {(() => {
                              const baseOptions = (position.candidateVolunteers && position.candidateVolunteers.length > 0
                                ? position.candidateVolunteers
                                : volunteers)
                              const assignedOnlyOptions = position.assignees
                                .map((assignee) => volunteers.find((v) => v.id === assignee.volunteerId))
                                .filter((v): v is VolunteerOption => !!v)
                                .filter((v) => !baseOptions.some((base) => base.id === v.id))
                              const mergedOptions = [...baseOptions, ...assignedOnlyOptions]
                              return mergedOptions.map((v) => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                              ))
                            })()}
                          </select>
                          {(!position.candidateVolunteers || position.candidateVolunteers.length === 0) && (
                            <p className="mt-1 text-xs text-gray-500">No position-shift candidates found; showing all volunteers for manual override.</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 bg-white border border-indigo-100 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-gray-900">Count Groups (single entry, primary + secondary)</h5>
                        <button
                          onClick={() => setGroupDrafts((prev) => [...prev, { name: `Group ${prev.length + 1}`, positionIds: [] }])}
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
                        >
                          + Add Group
                        </button>
                      </div>
                      <div className="space-y-3">
                        {groupDrafts.map((group, idx) => (
                          <div key={group.id || `new-${idx}`} className="border border-gray-200 rounded p-3">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                              <input
                                value={group.name}
                                onChange={(e) => setGroupDrafts((prev) => prev.map((g, i) => i === idx ? { ...g, name: e.target.value } : g))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Group name"
                              />
                              <select
                                value={group.primaryVolunteerId || ''}
                                onChange={(e) => setGroupDrafts((prev) => prev.map((g, i) => i === idx ? { ...g, primaryVolunteerId: e.target.value } : g))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Primary counter</option>
                                {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                              <select
                                value={group.secondaryVolunteerId || ''}
                                onChange={(e) => setGroupDrafts((prev) => prev.map((g, i) => i === idx ? { ...g, secondaryVolunteerId: e.target.value } : g))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Secondary verifier</option>
                                {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                              <button
                                onClick={() => setGroupDrafts((prev) => prev.filter((_, i) => i !== idx))}
                                className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            <select
                              multiple
                              value={group.positionIds}
                              onChange={(e) => {
                                const positionIds = Array.from(e.target.selectedOptions).map((option) => option.value)
                                setGroupDrafts((prev) => prev.map((g, i) => i === idx ? { ...g, positionIds } : g))
                              }}
                              className="w-full min-h-[90px] border border-gray-300 rounded text-sm"
                            >
                              {assignmentPositions.map((position) => (
                                <option key={position.id} value={position.id}>
                                  #{position.positionNumber} {position.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={async () => {
                            if (!assignmentSessionId) return

                            const seen = new Map<string, string>()
                            const duplicateLabels: string[] = []
                            for (const group of groupDrafts) {
                              for (const positionId of group.positionIds) {
                                if (seen.has(positionId)) {
                                  const positionLabel = assignmentPositions.find((p) => p.id === positionId)
                                  duplicateLabels.push(positionLabel ? `#${positionLabel.positionNumber} ${positionLabel.name}` : positionId)
                                } else {
                                  seen.set(positionId, group.name)
                                }
                              }
                            }
                            if (duplicateLabels.length > 0) {
                              const unique = [...new Set(duplicateLabels)]
                              const message = `Stations cannot be in multiple groups: ${unique.join(', ')}`
                              setError(message)
                              setGroupSaveMessage({ type: 'error', text: message })
                              return
                            }

                            const response = await fetch(`/api/events/${eventId}/count-sessions/${assignmentSessionId}/groups`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
                              body: JSON.stringify({ groups: groupDrafts })
                            })
                            const data = await response.json()
                            if (!response.ok || !data.success) {
                              setError(data.error || 'Failed to save groups')
                                setGroupSaveMessage({ type: 'error', text: data.error || 'Failed to save groups' })
                              return
                            }
                            setError('')
                              setGroupSaveMessage({ type: 'success', text: 'Count groups saved successfully.' })
                          }}
                          className="px-3 py-2 bg-emerald-600 text-white rounded text-sm"
                        >
                          Save Count Groups
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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

        {/* Create Count Session Modal - Only render on client side */}
        {typeof window !== 'undefined' && canManageContent && (
          <CreateCountSessionModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={createCountSession}
          />
        )}

        {/* Edit Count Session Modal - Only render on client side */}
        {typeof window !== 'undefined' && editingSession && (
          <EditCountSessionModal
            session={editingSession}
            eventId={eventId}
            onClose={() => setEditingSession(null)}
            onSuccess={() => {
              setEditingSession(null)
              router.reload()
            }}
          />
        )}
      </div>
    </EventPageWrapper>
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

    // Fetch event settings for moduleConfig
    const eventSettings = await prisma.events.findUnique({
      where: { id: id as string },
      select: { settings: true }
    })
    
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
      name: eventData.name,
      status: eventData.status,
      eventType: eventData.eventType,
      startDate: eventData.startDate?.toISOString() || new Date().toISOString()
    }

    const { computeSessionAttendanceBreakdown } = await import('../../../src/lib/countSessionReporting')

    const countSessions = await Promise.all(
      eventData.count_sessions.map(async (session) => {
        const breakdown = await computeSessionAttendanceBreakdown(session.id)
        return {
          id: session.id,
          sessionName: session.sessionName,
          countTime: session.countTime?.toISOString() || null,
          notes: session.notes,
          status: session.status,
          isActive: session.isActive,
          createdAt: session.createdAt?.toISOString() || null,
          reportedTotalAttendees: breakdown.attendeeTotal,
          position_counts: session.position_counts.map((count) => ({
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
        }
      })
    )

    // Check event-specific permissions
    const { canManageAttendants, canManageEvent, canDeleteEvent, canManagePermissions } = await import('../../../src/lib/eventAccess')
    const userId = session.user?.id || ''
    const canManageContent = await canManageAttendants(userId, id as string)
    const canEdit = await canManageEvent(userId, id as string)
    const canDelete = await canDeleteEvent(userId, id as string)
    const canManagePerms = await canManagePermissions(userId, id as string)

    return {
      props: {
        eventId: id as string,
        event,
        countSessions,
        canManageContent,
        canEdit,
        canDelete,
        canManagePermissions: canManagePerms,
        stats: {
          total: countSessions.length,
          active: countSessions.filter(s => s.isActive).length,
          completed: countSessions.filter(s => s.status === 'COMPLETED').length
        },
        moduleConfig: (eventSettings?.settings as any)?.modules
          ? {
              countTimes: (eventSettings!.settings as any).modules.countTimes ?? true,
              lanyards: (eventSettings!.settings as any).modules.lanyards ?? true,
              ivsModule: (eventSettings!.settings as any).modules.ivsModule ?? false,
              positions: (eventSettings!.settings as any).modules.positions ?? true,
              documents: (eventSettings!.settings as any).modules.documents ?? true,
              announcements: (eventSettings!.settings as any).modules.announcements ?? true,
            }
          : null,
        terminology: (eventSettings?.settings as any)?.terminology || null
      }
    }
  } catch (error) {
    console.error('Error fetching count-times data:', error)
    return { notFound: true }
  }
}
