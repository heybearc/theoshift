const OVERSIGHT_ROLES = new Set([
  'ADMIN',
  'OVERSEER',
  'ASSISTANT_OVERSEER',
  'KEYMAN',
  'SUPPORT',
])

export function isOversightRole(role: string): boolean {
  return OVERSIGHT_ROLES.has(role)
}
