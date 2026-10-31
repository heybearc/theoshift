import Link from 'next/link'
import { useEffect, useState } from 'react'
import { eventStationHref } from '../lib/eventPositionsHref'

type Person = {
  id: string
  firstName: string
  lastName: string
  congregation: string
  checkedIn: boolean
  lanyardBadge: string | null
  positionIds: string[]
  assignments: Array<{ positionId: string; positionName: string; area: string; day: string; when: string }>
  countTimes: Array<{ sessionId: string; label: string; when: string }>
}

type PeopleResponse = {
  success: boolean
  error?: string
  scope?: 'event' | 'mine'
  showCheckIn?: boolean
  myPositions?: Array<{ id: string; name: string }>
  people?: Person[]
}

type FilterId = 'all' | 'mine' | 'missing-checkin' | 'missing-lanyard'

export default function VolunteerPeoplePanel({
  eventId,
  focusId,
  focusName,
  search,
  showLanyards,
  showCountTimes,
  diagramDocumentId,
}: {
  eventId: string
  focusId: string
  focusName: string
  search: string
  showLanyards: boolean
  showCountTimes: boolean
  diagramDocumentId?: string | null
}) {
  const [people, setPeople] = useState<Person[]>([])
  const [myPositionIds, setMyPositionIds] = useState<string[]>([])
  const [scope, setScope] = useState<'event' | 'mine'>('mine')
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [filter, setFilter] = useState<FilterId>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setFilter('all')
    fetch(`/api/events/${eventId}/people?focusId=${encodeURIComponent(focusId)}`)
      .then(async (response) => {
        const data = (await response.json()) as PeopleResponse
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Could not load this list')
        }
        return data
      })
      .then((data) => {
        if (cancelled) return
        setPeople(data.people || [])
        setMyPositionIds((data.myPositions || []).map((position) => position.id))
        setScope(data.scope === 'event' ? 'event' : 'mine')
        setShowCheckIn(data.showCheckIn === true)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId, focusId])

  const needle = search.trim().toLowerCase()
  const mine = new Set(myPositionIds)
  const visible = people.filter((person) => {
    if (filter === 'mine' && !person.positionIds.some((id) => mine.has(id))) return false
    if (filter === 'missing-checkin' && person.checkedIn) return false
    if (filter === 'missing-lanyard' && person.lanyardBadge) return false
    if (!needle) return true
    const haystack = `${person.firstName} ${person.lastName} ${person.congregation} ${person.assignments
      .map((assignment) => assignment.positionName)
      .join(' ')}`.toLowerCase()
    return haystack.includes(needle)
  })

  const filters: Array<{ id: FilterId; label: string }> = [
    { id: 'all', label: 'All' },
    ...(myPositionIds.length > 0 ? [{ id: 'mine' as const, label: 'Their positions' }] : []),
    ...(showCheckIn ? [{ id: 'missing-checkin' as const, label: 'Not checked in' }] : []),
    ...(showLanyards ? [{ id: 'missing-lanyard' as const, label: 'No lanyard' }] : []),
  ]

  const lanyardCount = showLanyards ? visible.filter((person) => person.lanyardBadge).length : 0
  const checkedInCount = showCheckIn ? visible.filter((person) => person.checkedIn).length : 0

  return (
    <div className="bg-white shadow rounded-lg mb-4">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900">People for {focusName}</h3>
        <p className="mt-1 text-sm text-gray-600">
          {scope === 'event' ? 'Everyone on this event' : 'Volunteers assigned to them'}
          {showCheckIn ? ` · ${checkedInCount} checked in` : ''}
          {showLanyards ? ` · ${lanyardCount} with a lanyard` : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3 py-2 min-h-[44px] rounded-full text-sm font-medium ${
                filter === item.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {loading ? <p className="mt-4 text-sm text-gray-500">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!loading && !error && visible.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            {people.length === 0
              ? 'No volunteers are linked to them on this event yet.'
              : 'No one matches this search.'}
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {visible.map((person) => (
            <div key={person.id} className="border border-gray-200 rounded-lg p-4">
              <div className="text-base font-semibold text-gray-900">
                {person.lastName}, {person.firstName}
              </div>
              {person.congregation ? <div className="text-sm text-gray-600">{person.congregation}</div> : null}
              {showCheckIn ? (
                <div className="mt-1 text-sm text-gray-800">{person.checkedIn ? 'Checked in' : 'Not checked in'}</div>
              ) : null}
              {showLanyards ? (
                <div className="text-sm text-gray-800">
                  {person.lanyardBadge ? `Lanyard ${person.lanyardBadge}` : 'No lanyard'}
                </div>
              ) : null}
              {person.assignments.length === 0 ? (
                <div className="mt-2 text-sm text-gray-500">No assignment yet</div>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-gray-800">
                  {person.assignments.map((assignment) => (
                    <li key={`${person.id}-${assignment.positionId}-${assignment.when}`}>
                      <Link
                        href={eventStationHref(eventId, assignment.positionId, assignment.day)}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {assignment.positionName}
                        {assignment.when ? ` · ${assignment.when}` : ''}
                      </Link>
                      {assignment.area ? <span className="text-gray-600"> · {assignment.area}</span> : null}
                      {diagramDocumentId ? (
                        <a
                          href={`/api/events/${eventId}/documents/${diagramDocumentId}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-700 hover:underline"
                        >
                          Show on diagram
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {showCountTimes && person.countTimes.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-gray-800">
                  {person.countTimes.map((count) => (
                    <li key={`${person.id}-count-${count.sessionId}-${count.label}`}>
                      <Link
                        href={`/events/${eventId}/count-times/${count.sessionId}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        Counter: {count.label}
                        {count.when ? ` · ${count.when}` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
