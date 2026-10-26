/** Release-gate chat probes must not fan out to the event. */
export function isReleaseGateChatProbe(
  header: string | string[] | undefined,
  body: string | null | undefined
): boolean {
  const value = Array.isArray(header) ? header[0] : header
  if (value !== '1') return false
  return typeof body === 'string' && /^Pin test \d+$/.test(body.trim())
}
