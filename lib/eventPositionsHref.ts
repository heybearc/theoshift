/** Default Positions page (day board). Classic remains at `/positions`. */
export function eventPositionsHref(eventId: string): string {
  return `/events/${eventId}/positions-next`
}

/** Open one station on the day board so staff can see where it is and edit the shift. */
export function eventStationHref(eventId: string, positionId: string, day?: string): string {
  const params = new URLSearchParams({ station: positionId })
  if (day) params.set('day', day)
  return `/events/${eventId}/positions-next?${params.toString()}`
}

export function eventPositionsClassicHref(eventId: string): string {
  return `/events/${eventId}/positions`
}
