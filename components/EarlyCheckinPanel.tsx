import { useState, useEffect, useMemo } from 'react'
import { ConventionDay } from '@/generated/prisma/browser'
import {
  conventionDayLabel,
  EarlyCheckinVolunteerPayload,
  getCurrentConventionDay,
  isCheckedInForDay,
  isEligibleForDay,
} from '@/lib/ivsEarlyCheckin'
import { notifyAlert } from '../lib/ui/toast'
import { appConfirmMessage } from '../lib/ui/confirm'
import { getViewAsHeaders } from '@/lib/viewAsClient'
import { SafeDate } from './SafeDate'
import IvsDepartmentContactsPanel from './ivs/IvsDepartmentContactsPanel'

type ViewDay = ConventionDay | 'TODAY'

const DAY_TABS: Array<{ id: ViewDay; label: string }> = [
  { id: 'TODAY', label: 'Today' },
  { id: ConventionDay.FRIDAY, label: 'Fri' },
  { id: ConventionDay.SATURDAY, label: 'Sat' },
  { id: ConventionDay.SUNDAY, label: 'Sun' },
]

interface EarlyCheckinPanelProps {
  eventId: string
  eventName: string
  showHeader?: boolean
  onBack?: () => void
}

function resolveActiveDay(viewDay: ViewDay, today: ConventionDay | null): ConventionDay | null {
  if (viewDay !== 'TODAY') return viewDay
  return today
}

export default function EarlyCheckinPanel({
  eventId,
  eventName,
  showHeader = true,
  onBack,
}: EarlyCheckinPanelProps) {
  const [volunteers, setVolunteers] = useState<EarlyCheckinVolunteerPayload[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [exporting, setExporting] = useState(false)
  const [pendingCollapsed, setPendingCollapsed] = useState(false)
  const [checkedInCollapsed, setCheckedInCollapsed] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [viewDay, setViewDay] = useState<ViewDay>(() =>
    getCurrentConventionDay() ? 'TODAY' : ConventionDay.FRIDAY,
  )
  const [apiToday, setApiToday] = useState<ConventionDay | null>(() => getCurrentConventionDay())
  const [clientReady, setClientReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setApiToday(getCurrentConventionDay())
    setLastUpdated(new Date())
    setClientReady(true)
  }, [])

  const activeDay = resolveActiveDay(viewDay, apiToday)

  useEffect(() => {
    fetchVolunteers()

    const interval = setInterval(() => fetchVolunteers(true), 5000)
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchVolunteers(true)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [eventId, viewDay])

  const fetchVolunteers = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const dayQuery = viewDay === 'TODAY' ? 'TODAY' : viewDay
      const response = await fetch(
        `/api/volunteer/early-checkin?eventId=${eventId}&day=${dayQuery}`,
        { headers: { ...getViewAsHeaders() } },
      )
      if (response.ok) {
        const data = await response.json()
        setVolunteers(data.volunteers || [])
        if (data.today) setApiToday(data.today)
        setLastUpdated(new Date())
        setLoadError(null)
      } else {
        const data = await response.json().catch(() => ({}))
        setVolunteers([])
        setLoadError(data.message || `Could not load check-in list (${response.status})`)
      }
    } catch (error) {
      console.error('Error fetching volunteers:', error)
      if (!silent) setLoadError('Could not load check-in list')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleCheckIn = async (volunteerId: string, day: ConventionDay) => {
    try {
      const response = await fetch(`/api/volunteer/early-checkin/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ eventId, volunteerId, conventionDay: day }),
      })

      if (response.ok) {
        fetchVolunteers(true)
      } else {
        const data = await response.json()
        notifyAlert(data.message || 'Failed to check in volunteer')
      }
    } catch (error) {
      console.error('Error checking in:', error)
      notifyAlert('Error checking in volunteer')
    }
  }

  const handleUndoCheckIn = async (volunteerId: string, day: ConventionDay) => {
    if (
      !(await appConfirmMessage(
        `Undo ${conventionDayLabel(day)} check-in for this volunteer?`,
      ))
    ) {
      return
    }

    try {
      const response = await fetch(`/api/volunteer/early-checkin/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
        body: JSON.stringify({ eventId, volunteerId, conventionDay: day }),
      })

      if (response.ok) {
        fetchVolunteers(true)
      } else {
        const data = await response.json()
        notifyAlert(data.message || 'Failed to undo check-in')
      }
    } catch (error) {
      console.error('Error undoing check-in:', error)
      notifyAlert('Error undoing check-in')
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await fetch(`/api/volunteer/early-checkin/export?eventId=${eventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getViewAsHeaders() },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `IVS_Early_CheckIn_Report_${eventName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        notifyAlert('Failed to export check-in report')
      }
    } catch (error) {
      console.error('Error exporting:', error)
      notifyAlert('Error exporting check-in report')
    } finally {
      setExporting(false)
    }
  }

  const searchLower = searchTerm.toLowerCase()
  const matchesSearch = (v: EarlyCheckinVolunteerPayload) => {
    const fullName = `${v.firstName} ${v.lastName}`.toLowerCase()
    const congregation = v.congregation.toLowerCase()
    const department = (v.department || '').toLowerCase()
    return (
      fullName.includes(searchLower) ||
      congregation.includes(searchLower) ||
      department.includes(searchLower)
    )
  }

  const { pendingVolunteers, checkedInVolunteers } = useMemo(() => {
    if (!activeDay) {
      return { pendingVolunteers: [], checkedInVolunteers: [] }
    }

    const pending = volunteers
      .filter((v) => {
        if (!isEligibleForDay(v.earlyEntry, activeDay)) return false
        if (isCheckedInForDay(v.checkIns, activeDay)) return false
        return matchesSearch(v)
      })
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
      )

    const checkedIn = volunteers
      .filter((v) => {
        if (!isCheckedInForDay(v.checkIns, activeDay)) return false
        return matchesSearch(v)
      })
      .sort((a, b) => {
        const aTime = new Date(a.checkIns[activeDay]!.checkedInAt).getTime()
        const bTime = new Date(b.checkIns[activeDay]!.checkedInAt).getTime()
        return bTime - aTime
      })

    return { pendingVolunteers: pending, checkedInVolunteers: checkedIn }
  }, [volunteers, activeDay, searchLower])

  const dayHeading = !clientReady
    ? 'Today'
    : activeDay
      ? conventionDayLabel(activeDay)
      : 'Today (not a convention day)'

  return (
    <div className="flex flex-col">
      {showHeader && (
        <div
          className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-lg"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center justify-between mb-3 gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-white min-h-[44px] min-w-[44px] px-2 touch-manipulation"
              >
                ← Back
              </button>
            )}
            <h2 className="text-xl font-bold flex-1 text-center">IVS Early Check-In</h2>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="text-white text-sm disabled:opacity-50 min-h-[44px] px-2 touch-manipulation"
            >
              {exporting ? '...' : 'Export'}
            </button>
          </div>

          <input
            type="search"
            inputMode="search"
            autoCapitalize="off"
            autoCorrect="off"
            enterKeyHint="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, congregation, or department..."
            className="w-full px-4 py-3 rounded-lg text-gray-900 text-base"
            style={{ fontSize: '16px' }}
          />
        </div>
      )}

      {!showHeader && (
        <div className="p-4 bg-white border-b">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-3 min-h-[44px] touch-manipulation bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export Check-In Report'}
            </button>
          </div>
          <input
            type="search"
            inputMode="search"
            autoCapitalize="off"
            autoCorrect="off"
            enterKeyHint="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, congregation, or department..."
            className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500 text-base"
            style={{ fontSize: '16px' }}
          />
        </div>
      )}

      <div className="p-3 bg-white border-b">
        <IvsDepartmentContactsPanel eventId={eventId} mode="lookup" />
      </div>

      <div className="p-3 bg-white border-b flex flex-wrap gap-2">
        {DAY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewDay(tab.id)}
            className={`min-h-[44px] touch-manipulation rounded-lg px-4 py-2 text-sm font-semibold ${
              viewDay === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.id === 'TODAY' && apiToday ? ` (${conventionDayLabel(apiToday).slice(0, 3)})` : ''}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white border-b">
        <p className="text-sm font-medium text-gray-700 mb-2">Viewing: {dayHeading}</p>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-orange-600">{pendingVolunteers.length}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{checkedInVolunteers.length}</div>
            <div className="text-xs text-gray-600">Checked In</div>
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-gray-500">
          Last updated:{' '}
          <span suppressHydrationWarning>
            {clientReady && lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
          </span>
          <span className="ml-2 text-green-600">● Live</span>
        </div>
      </div>

      <div className={`p-4 ${showHeader ? 'pb-28' : ''}`}>
        {loadError ? (
          <div className="text-center py-8 text-red-600 px-4">{loadError}</div>
        ) : loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : !activeDay ? (
          <div className="text-center py-8 text-gray-500 px-4">
            Today is not a convention day. Tap <strong>Fri</strong>, <strong>Sat</strong>, or{' '}
            <strong>Sun</strong> above to view that day&apos;s early check-in list.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
              <button
                type="button"
                onClick={() => setPendingCollapsed(!pendingCollapsed)}
                className="w-full px-4 py-3 min-h-[48px] touch-manipulation bg-orange-50 border-l-4 border-orange-500 flex items-center justify-between active:bg-orange-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{pendingCollapsed ? '▶' : '▼'}</span>
                  <h2 className="font-bold text-lg text-orange-900">PENDING — {dayHeading}</h2>
                  <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded-full text-sm font-semibold">
                    {pendingVolunteers.length}
                  </span>
                </div>
              </button>

              {!pendingCollapsed && (
                <div className="p-4">
                  {pendingVolunteers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No pending check-ins</div>
                  ) : (
                    <div className="space-y-3">
                      {pendingVolunteers.map((volunteer) => (
                        <div key={volunteer.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-semibold text-lg">
                                {volunteer.firstName} {volunteer.lastName}
                              </div>
                              <div className="text-sm text-gray-600">{volunteer.congregation}</div>
                              {volunteer.department ? (
                                <div className="text-sm text-gray-500">{volunteer.department}</div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCheckIn(volunteer.id, activeDay)}
                              className="shrink-0 px-6 py-3 min-h-[48px] touch-manipulation bg-green-600 text-white rounded-lg font-semibold active:bg-green-700"
                            >
                              Check In
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <button
                type="button"
                onClick={() => setCheckedInCollapsed(!checkedInCollapsed)}
                className="w-full px-4 py-3 min-h-[48px] touch-manipulation bg-green-50 border-l-4 border-green-500 flex items-center justify-between active:bg-green-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{checkedInCollapsed ? '▶' : '▼'}</span>
                  <h2 className="font-bold text-lg text-green-900">CHECKED IN — {dayHeading}</h2>
                  <span className="px-2 py-1 bg-green-200 text-green-900 rounded-full text-sm font-semibold">
                    {checkedInVolunteers.length}
                  </span>
                </div>
              </button>

              {!checkedInCollapsed && (
                <div className="p-4">
                  {checkedInVolunteers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No check-ins yet</div>
                  ) : (
                    <div className="space-y-3">
                      {checkedInVolunteers.map((volunteer) => {
                        const record = volunteer.checkIns[activeDay]!
                        return (
                          <div key={volunteer.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold text-lg">
                                  {volunteer.firstName} {volunteer.lastName}
                                </div>
                                <div className="text-sm text-gray-600">{volunteer.congregation}</div>
                              {volunteer.department ? (
                                <div className="text-sm text-gray-500">{volunteer.department}</div>
                              ) : null}
                                <div className="text-xs text-gray-500 mt-1">
                                  Checked in:{' '}
                                  <SafeDate dateString={record.checkedInAt} format="datetime" />
                                  {record.checkedInBy ? ` · ${record.checkedInBy}` : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUndoCheckIn(volunteer.id, activeDay)}
                                className="shrink-0 px-4 py-3 min-h-[44px] touch-manipulation bg-red-100 text-red-700 rounded-md text-sm font-medium active:bg-red-200"
                              >
                                Undo
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
