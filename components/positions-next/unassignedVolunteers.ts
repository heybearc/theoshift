import type { Position, Volunteer } from './types'

function formsIncludeLeadership(formsOfService: unknown): boolean {
  const forms = Array.isArray(formsOfService)
    ? formsOfService
    : typeof formsOfService === 'string'
      ? (() => {
          try {
            return JSON.parse(formsOfService)
          } catch {
            return []
          }
        })()
      : []
  return (
    Array.isArray(forms) &&
    (forms.includes('Overseer') || forms.includes('Keyman'))
  )
}

/** Active volunteers with no assignment and no oversight/leadership role. */
export function listUnassignedVolunteers(
  positions: Position[],
  attendants: Volunteer[]
): Volunteer[] {
  const assigned = new Set<string>()
  const leadership = new Set<string>()

  for (const position of positions) {
    for (const assignment of position.assignments || []) {
      if (assignment.volunteer?.id) assigned.add(assignment.volunteer.id)
    }
    for (const oversight of position.oversight || []) {
      if (oversight.overseer?.id) leadership.add(oversight.overseer.id)
      if (oversight.keyman?.id) leadership.add(oversight.keyman.id)
    }
  }

  for (const att of attendants) {
    const role = att.user?.role
    if (
      att.isOverseer ||
      att.isKeyman ||
      role === 'OVERSEER' ||
      role === 'KEYMAN' ||
      formsIncludeLeadership(att.formsOfService)
    ) {
      leadership.add(att.id)
    }
  }

  return attendants.filter(
    (att) => att.isActive !== false && !assigned.has(att.id) && !leadership.has(att.id)
  )
}
