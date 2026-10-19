/** Placeholder addresses such as changeme@example.com must not be mailed. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return (email || '').toLowerCase().includes('changeme')
}
