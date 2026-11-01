import { prisma } from './prisma'

export type SessionAttendanceBreakdown = {
  attendeeTotal: number
  /** For UI labels like “N stations” — groups count as one slot each plus ungrouped position rows */
  reportingSlots: number
  /** True when a group or station row has a saved number, including zero. */
  hasSubmission: boolean
}

/**
 * Session totals must combine:
 * - Per-position `position_counts` (legacy / enter-count page)
 * - Station groups (`count_group_entries`) where one number covers multiple positions
 *
 * For positions that belong to a group: use the group entry when set; otherwise sum that group's
 * position_counts. Ungrouped positions add their own position_counts row.
 */
export async function computeSessionAttendanceBreakdown(
  countSessionId: string
): Promise<SessionAttendanceBreakdown> {
  const [groups, positionRows] = await Promise.all([
    prisma.count_session_groups.findMany({
      where: { countSessionId },
      include: {
        entry: true,
        positions: { select: { positionId: true } },
      },
    }),
    prisma.position_counts.findMany({
      where: { countSessionId },
      select: { positionId: true, attendeeCount: true },
    }),
  ])

  const pcByPosition = new Map(positionRows.map((pc) => [pc.positionId, pc]))

  const groupedPositionIds = new Set<string>()
  for (const g of groups) {
    for (const row of g.positions) {
      groupedPositionIds.add(row.positionId)
    }
  }

  let attendeeTotal = 0
  let hasSubmission = false

  for (const g of groups) {
    const posIds = g.positions.map((p) => p.positionId)
    if (g.entry?.attendeeCount != null) {
      attendeeTotal += g.entry.attendeeCount
      hasSubmission = true
    } else {
      for (const pid of posIds) {
        const count = pcByPosition.get(pid)?.attendeeCount
        if (count != null) hasSubmission = true
        attendeeTotal += count ?? 0
      }
    }
  }

  for (const pc of positionRows) {
    if (!groupedPositionIds.has(pc.positionId)) {
      if (pc.attendeeCount != null) hasSubmission = true
      attendeeTotal += pc.attendeeCount ?? 0
    }
  }

  let reportingSlots = 0
  for (const g of groups) {
    const posIds = g.positions.map((p) => p.positionId)
    const hasEntry = g.entry?.attendeeCount != null
    const hasPositionData = posIds.some(
      (pid) => (pcByPosition.get(pid)?.attendeeCount ?? null) != null
    )
    if (hasEntry || hasPositionData) reportingSlots += 1
  }

  const ungroupedRows = positionRows.filter((pc) => !groupedPositionIds.has(pc.positionId))
  reportingSlots += ungroupedRows.length

  return { attendeeTotal, reportingSlots, hasSubmission }
}

export function countSessionProgress(input: {
  groups: Array<{ attendeeCount: number | null }>
  ungrouped: Array<{ attendeeCount: number | null }>
  positionCounts: Array<{ attendeeCount: number | null }>
}): { total: number; counted: number; pending: number } {
  const countedIn = (rows: Array<{ attendeeCount: number | null }>) =>
    rows.filter((row) => row.attendeeCount != null).length

  if (input.groups.length > 0) {
    const total = input.groups.length + input.ungrouped.length
    const counted = countedIn(input.groups) + countedIn(input.ungrouped)
    return { total, counted, pending: total - counted }
  }

  const total = input.positionCounts.length
  const counted = countedIn(input.positionCounts)
  return { total, counted, pending: total - counted }
}
