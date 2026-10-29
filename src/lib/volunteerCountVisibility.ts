/** Extra wait after an earlier count before a closely scheduled next count replaces it. */
export const VOLUNTEER_COUNT_HANDOFF_MS = 60 * 60 * 1000

export type AssignedCountSessionTime = {
  id: string
  countTime: Date | string | null
}

function toMillis(value: Date | string | null | undefined): number | null {
  if (value == null) return null
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * When a later assigned count becomes the one the volunteer should see.
 * The first session is available as soon as it is active.
 * A later session waits until its own count time, so a 2:00 count does not
 * appear an hour after a 10:00 count. If the next count is sooner than
 * `handoffMs` after the previous one, it waits out that gap instead.
 */
export function countSessionBecomesCurrentAt(
  sessions: AssignedCountSessionTime[],
  index: number,
  handoffMs: number = VOLUNTEER_COUNT_HANDOFF_MS
): number {
  if (index <= 0) return Number.NEGATIVE_INFINITY
  const previousMs = toMillis(sessions[index - 1]?.countTime)
  const ownMs = toMillis(sessions[index]?.countTime)
  if (previousMs == null || ownMs == null) return Number.NEGATIVE_INFINITY
  if (ownMs <= previousMs) return Number.NEGATIVE_INFINITY
  const afterHandoff = previousMs + handoffMs
  return ownMs <= afterHandoff ? afterHandoff : ownMs
}

/**
 * Volunteers assigned to more than one active count see a single count time:
 * the latest one that is already due. Earlier forms drop off when the next
 * count takes over, so two entry forms are never on screen together.
 * Sessions that share a count time stay together. A session with no count
 * time stays visible.
 */
export function volunteerVisibleCountSessions(
  sessions: AssignedCountSessionTime[],
  now: Date = new Date(),
  handoffMs: number = VOLUNTEER_COUNT_HANDOFF_MS
): { visibleIds: Set<string>; nextRevealAt: Date | null } {
  const sorted = [...sessions].sort((a, b) => {
    const ta = toMillis(a.countTime)
    const tb = toMillis(b.countTime)
    if (ta == null && tb == null) return 0
    if (ta == null) return -1
    if (tb == null) return 1
    if (ta !== tb) return ta - tb
    return a.id.localeCompare(b.id)
  })

  const nowMs = now.getTime()
  let currentIndex = -1
  for (let i = 0; i < sorted.length; i++) {
    if (toMillis(sorted[i].countTime) == null) continue
    if (countSessionBecomesCurrentAt(sorted, i, handoffMs) <= nowMs) {
      currentIndex = i
    }
  }

  const visibleIds = new Set<string>()
  for (const session of sorted) {
    if (toMillis(session.countTime) == null) visibleIds.add(session.id)
  }

  let nextRevealAt: Date | null = null
  if (currentIndex >= 0) {
    const currentMs = toMillis(sorted[currentIndex].countTime)
    for (let i = 0; i < sorted.length; i++) {
      const sessionMs = toMillis(sorted[i].countTime)
      if (sessionMs != null && currentMs != null && sessionMs === currentMs) {
        visibleIds.add(sorted[i].id)
      }
    }
    for (let i = currentIndex + 1; i < sorted.length; i++) {
      const revealMs = countSessionBecomesCurrentAt(sorted, i, handoffMs)
      if (revealMs !== Number.NEGATIVE_INFINITY) {
        nextRevealAt = new Date(revealMs)
        break
      }
    }
  } else if (sorted.length > 0) {
    for (const session of sorted) visibleIds.add(session.id)
  }

  return { visibleIds, nextRevealAt }
}
