/** Display order: general & broadcast-like first, then DMs, positions, staff-internal. */
export function sortEventChatChannels<T extends { type: string; name: string }>(channels: T[]): T[] {
  const rank = (t: string) => {
    if (t === 'EVENT_ANNOUNCEMENTS') return 0
    if (t === 'EVENT_GENERAL') return 1
    if (t === 'VOLUNTEER_DM') return 2
    if (t === 'POSITION') return 3
    if (t === 'STAFF_INTERNAL') return 4
    return 9
  }
  return [...channels].sort((a, b) => {
    const d = rank(a.type) - rank(b.type)
    if (d !== 0) return d
    return a.name.localeCompare(b.name)
  })
}
