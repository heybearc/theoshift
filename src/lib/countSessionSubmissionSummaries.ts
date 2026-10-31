type PositionRow = {
  positionId: string
  attendeeCount: number | null
  notes: string | null
  countedBy: string | null
  countedAt: Date
  position: {
    id: string
    positionNumber: number
    name: string
    area: string | null
  }
}

type PersonName = { firstName: string; lastName: string }

function personName(person: PersonName | null | undefined): string | null {
  if (!person) return null
  const name = `${person.firstName} ${person.lastName}`.trim()
  return name || null
}

type GroupRow = {
  id: string
  name: string
  primaryVolunteer?: PersonName | null
  secondaryVolunteer?: PersonName | null
  entry: {
    attendeeCount: number | null
    notes: string | null
    enteredAt: Date | null
    enteredByUser: PersonName | null
    enteredByVolunteer?: PersonName | null
  } | null
  positions: Array<{
    positionId: string
    position: { positionNumber: number; name: string; area: string | null }
  }>
}

export type GroupSubmissionSummary = {
  groupId: string
  groupName: string
  attendeeCount: number | null
  notes: string | null
  submittedBy: string | null
  submittedAt: string | null
  stationsLabel: string
  /** group total vs summed per-station vs none */
  source: 'group_entry' | 'per_station' | 'none'
}

export type UngroupedPositionSubmission = {
  positionId: string
  positionNumber: number
  positionName: string
  area: string | null
  attendeeCount: number | null
  notes: string | null
  countedAt: string | null
  submittedBy: string | null
}

export function buildCountSubmissionSummaries(
  groups: GroupRow[],
  positionCounts: PositionRow[],
  resolveActorName: (id: string | null | undefined) => string | null
): {
  groupSubmissionSummaries: GroupSubmissionSummary[]
  ungroupedPositionSubmissions: UngroupedPositionSubmission[]
} {
  const groupedPositionIds = new Set<string>()
  for (const g of groups) {
    for (const row of g.positions) {
      groupedPositionIds.add(row.positionId)
    }
  }

  const pcByPositionId = new Map(positionCounts.map((pc) => [pc.positionId, pc]))

  const groupSubmissionSummaries: GroupSubmissionSummary[] = groups.map((g) => {
    const pcsInGroup = g.positions
      .map((row) => pcByPositionId.get(row.positionId))
      .filter((x): x is PositionRow => !!x)

    const stationsLabel = g.positions
      .map((row) => `#${row.position.positionNumber} ${row.position.name}`)
      .join('; ')

    const sumFromStations = pcsInGroup.reduce((s, pc) => s + (pc.attendeeCount ?? 0), 0)
    const hasStationNumbers = pcsInGroup.some((pc) => pc.attendeeCount != null)

    let attendeeCount: number | null = null
    let source: GroupSubmissionSummary['source'] = 'none'
    if (g.entry?.attendeeCount != null) {
      attendeeCount = g.entry.attendeeCount
      source = 'group_entry'
    } else if (hasStationNumbers) {
      attendeeCount = sumFromStations
      source = 'per_station'
    }

    let submittedBy: string | null =
      personName(g.entry?.enteredByUser) || personName(g.entry?.enteredByVolunteer)
    if (!submittedBy) {
      submittedBy = personName(g.primaryVolunteer) || personName(g.secondaryVolunteer)
    }
    if (!submittedBy && pcsInGroup.length) {
      const names = [
        ...new Set(pcsInGroup.map((pc) => resolveActorName(pc.countedBy)).filter(Boolean)),
      ] as string[]
      if (names.length === 1) submittedBy = names[0]!
      else if (names.length > 1) submittedBy = 'Multiple stations'
    }

    let submittedAt: string | null = null
    if (g.entry?.enteredAt) {
      submittedAt = g.entry.enteredAt.toISOString()
    } else if (pcsInGroup.length) {
      const times = pcsInGroup.map((pc) => new Date(pc.countedAt).getTime())
      submittedAt = new Date(Math.max(...times)).toISOString()
    }

    const notes = g.entry?.notes ?? null

    return {
      groupId: g.id,
      groupName: g.name,
      attendeeCount,
      notes,
      submittedBy,
      submittedAt,
      stationsLabel,
      source,
    }
  })

  const ungroupedPositionSubmissions: UngroupedPositionSubmission[] = positionCounts
    .filter((pc) => !groupedPositionIds.has(pc.positionId))
    .map((pc) => ({
      positionId: pc.positionId,
      positionNumber: pc.position.positionNumber,
      positionName: pc.position.name,
      area: pc.position.area,
      attendeeCount: pc.attendeeCount,
      notes: pc.notes,
      countedAt: pc.countedAt?.toISOString() ?? null,
      submittedBy: resolveActorName(pc.countedBy),
    }))
    .sort((a, b) => a.positionNumber - b.positionNumber)

  return { groupSubmissionSummaries, ungroupedPositionSubmissions }
}
