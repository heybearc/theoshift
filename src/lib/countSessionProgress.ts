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
