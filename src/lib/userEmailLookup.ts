import { prisma } from '@/lib/prisma'

/**
 * Resolves a staff user by email using case-insensitive match.
 * Login emails are not case-sensitive; return the row with the stored address.
 */
export async function findUserByEmailCaseInsensitive(email: string) {
  const trimmed = email.trim()
  if (!trimmed) {
    return null
  }
  return prisma.users.findFirst({
    where: {
      email: { equals: trimmed, mode: 'insensitive' },
    },
  })
}
