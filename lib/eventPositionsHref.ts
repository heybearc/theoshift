/** Default Positions page (day board). Classic remains at `/positions`. */
export function eventPositionsHref(eventId: string): string {
  return `/events/${eventId}/positions-next`
}

export function eventPositionsClassicHref(eventId: string): string {
  return `/events/${eventId}/positions`
}
