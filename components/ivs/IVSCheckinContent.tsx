import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { ConventionDay } from '@/generated/prisma/browser'
import { useScrollRestoration } from '../../hooks/useScrollRestoration'
import {
  conventionDayLabel,
  getCurrentConventionDay,
  isCheckedInForDay,
  isEligibleForDay,
  EarlyEntrySchedule,
} from '@/lib/ivsEarlyCheckin'
import { notifyAlert } from '../../lib/ui/toast'
import { appConfirmMessage } from '../../lib/ui/confirm'
import { SafeDate } from '../SafeDate'
import IvsDepartmentContactsPanel from './IvsDepartmentContactsPanel'

type ViewDay = ConventionDay | 'TODAY'

const DAY_TABS: Array<{ id: ViewDay; label: string }> = [
  { id: 'TODAY', label: 'Today' },
  { id: ConventionDay.FRIDAY, label: 'Fri' },
  { id: ConventionDay.SATURDAY, label: 'Sat' },
  { id: ConventionDay.SUNDAY, label: 'Sun' },
]

interface IVSVolunteer {
  id: string
  firstName: string
  lastName: string
  congregation: string
  earlyEntry: EarlyEntrySchedule
  checkIns: Partial<Record<ConventionDay, { checkedInAt: string; checkedInBy: string | null }>>
  earlyCheckinEligible?: boolean
  submittedBy?: string
}

interface IVSCheckinContentProps {
  event: { id: string; name: string }
}

function resolveActiveDay(viewDay: ViewDay, today: ConventionDay | null): ConventionDay | null {
  if (viewDay !== 'TODAY') return viewDay
  return today
}

export default function IVSCheckinContent({ event }: IVSCheckinContentProps) {
  const router = useRouter()
  const eventId = event.id
  const [volunteers, setVolunteers] = useState<IVSVolunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [exporting, setExporting] = useState(false)
  const [pendingCollapsed, setPendingCollapsed] = useState(false)
  const [checkedInCollapsed, setCheckedInCollapsed] = useState(false)
  const [viewDay, setViewDay] = useState<ViewDay>('TODAY')
  const [conventionToday, setConventionToday] = useState<ConventionDay | null>(null)
  const [clientReady, setClientReady] = useState(false)

  useEffect(() => {
    setConventionToday(getCurrentConventionDay())
    setLastUpdated(new Date())
    setClientReady(true)
  }, [])

  const activeDay = resolveActiveDay(viewDay, conventionToday)

  useScrollRestoration(`${router.asPath}:ivs-checkin`, !loading)

  useEffect(() => {
    fetchVolunteers()

    const pollInterval = setInterval(() => {
      if (!document.hidden) fetchVolunteers(true)
    }, 5000)

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchVolunteers(true)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [eventId])

  const fetchVolunteers = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers`)
      if (response.ok) {
        const data = await response.json()
        setVolunteers(data.volunteers || [])
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Error fetching volunteers:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleCheckIn = async (volunteerId: string, day: ConventionDay) => {
    try {
      const response = await fetch(`/api/events/${eventId}/ivs/volunteers/${volunteerId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conventionDay: day }),
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
    if (!(await appConfirmMessage(`Undo ${conventionDayLabel(day)} check-in for this volunteer?`))) {
      return
    }

    try {
      const response = await fetch(
        `/api/events/${eventId}/ivs/volunteers/${volunteerId}/undo-check-in`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conventionDay: day }),
        },
      )

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
      const response = await fetch(`/api/events/${eventId}/ivs/checkin-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `IVS_Early_CheckIn_Report_${event.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
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
  const matchesSearch = (v: IVSVolunteer) => {
    const fullName = `${v.firstName} ${v.lastName}`.toLowerCase()
    const congregation = v.congregation.toLowerCase()
    const department = (v.submittedBy || '').toLowerCase()
    return (
      fullName.includes(searchLower) ||
      congregation.includes(searchLower) ||
      department.includes(searchLower)
    )
  }

  const { pendingVolunteers, checkedInVolunteers, eligibleCount } = useMemo(() => {
    if (!activeDay) {
      return { pendingVolunteers: [], checkedInVolunteers: [], eligibleCount: 0 }
    }

    const pending = volunteers
      .filter((v) => {
        const schedule = v.earlyEntry ?? { friday: false, saturday: false, sunday: false }
        if (!isEligibleForDay(schedule, activeDay)) return false
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

    const eligible = volunteers.filter((v) => {
      const schedule = v.earlyEntry ?? { friday: false, saturday: false, sunday: false }
      return isEligibleForDay(schedule, activeDay)
    }).length

    return { pendingVolunteers: pending, checkedInVolunteers: checkedIn, eligibleCount: eligible }
  }, [volunteers, activeDay, searchLower])

  const dayHeading = !clientReady
    ? 'Today'
    : activeDay
      ? conventionDayLabel(activeDay)
      : 'Today (not a convention day)'

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-base font-medium"
        >
          {exporting ? 'Exporting...' : 'Export Check-In Report'}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          enterKeyHint="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, congregation, or department..."
          className="w-full min-h-[44px] px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-base"
        />
      </div>

      <div className="mb-4">
        <IvsDepartmentContactsPanel eventId={eventId} mode="lookup" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {DAY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewDay(tab.id)}
            className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-semibold ${
              viewDay === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.id === 'TODAY' && activeDay && viewDay === 'TODAY'
              ? ` (${conventionDayLabel(activeDay).slice(0, 3)})`
              : ''}
          </button>
        ))}
      </div>

      <div className="p-3 sm:p-4 bg-white border rounded-lg shadow-sm mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2 text-center">Viewing: {dayHeading}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">
              {pendingVolunteers.length}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600 leading-tight">Pending</div>
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600 tabular-nums">
              {checkedInVolunteers.length}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600 leading-tight">Checked In</div>
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold text-gray-600 tabular-nums">
              {eligibleCount}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600 leading-tight">Eligible</div>
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

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : !activeDay ? (
        <div className="text-center py-8 text-gray-500">
          Early check-in is only available on Friday, Saturday, or Sunday (event local time).
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
            <button
              type="button"
              onClick={() => setPendingCollapsed(!pendingCollapsed)}
              className="w-full px-4 py-3 bg-orange-50 border-l-4 border-orange-500 flex items-center justify-between gap-2 hover:bg-orange-100 transition-colors text-left min-h-[48px]"
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{pendingCollapsed ? '▶' : '▼'}</span>
                <h2 className="font-bold text-base sm:text-lg text-orange-900">
                  PENDING — {dayHeading}
                </h2>
                <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded-full text-sm font-semibold shrink-0">
                  {pendingVolunteers.length}
                </span>
              </div>
            </button>

            {!pendingCollapsed && (
              <div className="p-4">
                {pendingVolunteers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? 'No pending volunteers found matching your search'
                      : 'No volunteers pending check-in for this day'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingVolunteers.map((volunteer) => (
                      <div
                        key={volunteer.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-lg break-words">
                              {volunteer.firstName} {volunteer.lastName}
                            </div>
                            <div className="text-sm text-gray-600 break-words">
                              {volunteer.congregation}
                            </div>
                            {volunteer.submittedBy ? (
                              <div className="text-sm text-gray-500 break-words">
                                {volunteer.submittedBy}
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCheckIn(volunteer.id, activeDay)}
                            className="w-full sm:w-auto shrink-0 min-h-[48px] px-6 py-3 bg-green-600 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-green-700 active:bg-green-800 shadow-lg"
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
              className="w-full px-4 py-3 bg-green-50 border-l-4 border-green-500 flex items-center justify-between gap-2 hover:bg-green-100 transition-colors text-left min-h-[48px]"
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{checkedInCollapsed ? '▶' : '▼'}</span>
                <h2 className="font-bold text-base sm:text-lg text-green-900">
                  CHECKED IN — {dayHeading}
                </h2>
                <span className="px-2 py-1 bg-green-200 text-green-900 rounded-full text-sm font-semibold shrink-0">
                  {checkedInVolunteers.length}
                </span>
              </div>
            </button>

            {!checkedInCollapsed && (
              <div className="p-4">
                {checkedInVolunteers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm
                      ? 'No checked-in volunteers found matching your search'
                      : 'No volunteers checked in yet for this day'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checkedInVolunteers.map((volunteer) => {
                      const record = volunteer.checkIns[activeDay]!
                      return (
                        <div key={volunteer.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-lg break-words">
                                {volunteer.firstName} {volunteer.lastName}
                              </div>
                              <div className="text-sm text-gray-600 break-words">
                                {volunteer.congregation}
                              </div>
                              {volunteer.submittedBy ? (
                                <div className="text-sm text-gray-500 break-words">
                                  {volunteer.submittedBy}
                                </div>
                              ) : null}
                              <div className="text-xs text-gray-500 mt-1 break-words">
                                Checked in:{' '}
                                <SafeDate dateString={record.checkedInAt} format="datetime" />
                                {record.checkedInBy ? ` · ${record.checkedInBy}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <div className="text-green-600 text-2xl" aria-hidden>
                                ✓
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUndoCheckIn(volunteer.id, activeDay)}
                                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 active:bg-red-300 sm:whitespace-nowrap"
                              >
                                Undo
                              </button>
                            </div>
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
    </>
  )
}
