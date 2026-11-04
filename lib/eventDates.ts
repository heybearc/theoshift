import { parseDateKey, toDateKey } from './shiftConflict'

export { parseDateKey, toDateKey }

/** All calendar days from event start through end (inclusive), as YYYY-MM-DD. */
export function enumerateEventDateKeys(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string[] {
  const startKey = toDateKey(startDate)
  const endKey = toDateKey(endDate)
  if (!startKey) return []
  const lastKey = endKey || startKey

  const keys: string[] = []
  let cursor = parseDateKey(startKey)
  const end = parseDateKey(lastKey)
  // Cap runaway ranges (bad data)
  for (let i = 0; i < 60 && cursor.getTime() <= end.getTime(); i++) {
    keys.push(cursor.toISOString().slice(0, 10))
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  return keys
}

export function formatEventDayLabel(dateKey: string): string {
  const d = parseDateKey(dateKey)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(d)
}

/** Whole days from one calendar day to another. Positive when `toKey` is later. */
export function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey).getTime()
  const to = parseDateKey(toKey).getTime()
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

/** Move a YYYY-MM-DD key by whole days. */
export function addDaysToDateKey(key: string, days: number): string {
  const next = new Date(parseDateKey(key).getTime() + days * 24 * 60 * 60 * 1000)
  return next.toISOString().slice(0, 10)
}

export function isMultiDayEvent(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): boolean {
  const keys = enumerateEventDateKeys(startDate, endDate)
  return keys.length > 1
}
