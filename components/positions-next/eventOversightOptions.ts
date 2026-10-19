import type { Volunteer } from './types'

function byName(a: Volunteer, b: Volunteer): number {
  return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
}

function activeWithFlag(
  attendants: Volunteer[],
  flag: 'isOverseer' | 'isKeyman'
): Volunteer[] {
  return attendants
    .filter((person) => person.isActive !== false && Boolean(person[flag]))
    .sort(byName)
}

/** Overseers marked on this event's volunteer roster. */
export function listEventOverseers(attendants: Volunteer[]): Volunteer[] {
  return activeWithFlag(attendants, 'isOverseer')
}

/** Keymen marked on this event's volunteer roster. */
export function listEventKeymen(attendants: Volunteer[]): Volunteer[] {
  return activeWithFlag(attendants, 'isKeyman')
}
