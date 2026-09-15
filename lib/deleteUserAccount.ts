import { prisma } from '@/lib/prisma'

export type ResolvedAccount = {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    congregation: string | null
    role: string
    isActive: boolean
  } | null
  volunteer: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    congregation: string
    isActive: boolean
    userId: string | null
  } | null
}

/**
 * Resolve the signed-in actor to users and/or volunteers rows.
 * Staff sessions use users.id; volunteer sessions use volunteers.id.
 */
export async function resolveAccountFromSession(sessionUser: {
  id?: string | null
  email?: string | null
  role?: string | null
}): Promise<ResolvedAccount> {
  const id = sessionUser.id || ''
  const email = sessionUser.email || ''
  const role = sessionUser.role || ''

  let user = id
    ? await prisma.users.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          congregation: true,
          role: true,
          isActive: true
        }
      })
    : null

  if (!user && email) {
    user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        congregation: true,
        role: true,
        isActive: true
      }
    })
  }

  let volunteer = null as ResolvedAccount['volunteer']

  if (role === 'VOLUNTEER' && id) {
    volunteer = await prisma.volunteers.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        congregation: true,
        isActive: true,
        userId: true
      }
    })
  }

  if (!volunteer && user) {
    volunteer = await prisma.volunteers.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        congregation: true,
        isActive: true,
        userId: true
      }
    })
  }

  if (!volunteer && email) {
    volunteer = await prisma.volunteers.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        congregation: true,
        isActive: true,
        userId: true
      }
    })
  }

  // Volunteer row may link back to a users row not found by session id
  if (!user && volunteer?.userId) {
    user = await prisma.users.findUnique({
      where: { id: volunteer.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        congregation: true,
        role: true,
        isActive: true
      }
    })
  }

  return { user, volunteer }
}

/**
 * Permanently remove personal data for this account.
 * Clears assignment / oversight FKs so deletion succeeds even when the person is assigned.
 */
export async function deleteUserAccount(account: ResolvedAccount): Promise<{
  deletedUserId: string | null
  deletedVolunteerId: string | null
  removedAssignments: number
}> {
  const userId = account.user?.id || null
  const volunteerId = account.volunteer?.id || null

  if (!userId && !volunteerId) {
    throw new Error('No account found to delete')
  }

  // Block deleting the last active admin
  if (account.user?.role === 'ADMIN') {
    const otherAdmins = await prisma.users.count({
      where: {
        role: 'ADMIN',
        isActive: true,
        id: { not: account.user.id }
      }
    })
    if (otherAdmins === 0) {
      throw new Error('Cannot delete the last active admin account. Promote another admin first.')
    }
  }

  return prisma.$transaction(async (tx) => {
    let removedAssignments = 0

    if (volunteerId) {
      // Clear non-cascading FKs pointing at this volunteer
      await tx.position_assignments.updateMany({
        where: { overseerId: volunteerId },
        data: { overseerId: null }
      })
      await tx.position_assignments.updateMany({
        where: { keymanId: volunteerId },
        data: { keymanId: null }
      })

      await tx.position_oversight_assignments.updateMany({
        where: { overseerId: volunteerId },
        data: { overseerId: null }
      })
      await tx.position_oversight_assignments.updateMany({
        where: { keymanId: volunteerId },
        data: { keymanId: null }
      })

      await tx.event_volunteers.updateMany({
        where: { overseerId: volunteerId },
        data: { overseerId: null }
      })
      await tx.event_volunteers.updateMany({
        where: { keymanId: volunteerId },
        data: { keymanId: null }
      })

      removedAssignments = await tx.position_assignments.count({
        where: { volunteerId }
      })

      await tx.volunteers.delete({ where: { id: volunteerId } })
    }

    if (userId) {
      await tx.position_assignments.updateMany({
        where: { assignedBy: userId },
        data: { assignedBy: null }
      })
      await tx.position_oversight_assignments.updateMany({
        where: { assignedBy: userId },
        data: { assignedBy: null }
      })

      // Announcements require createdBy (NoAction) — remove ones they authored
      await tx.announcements.deleteMany({ where: { createdBy: userId } })
      await tx.global_announcements.deleteMany({ where: { createdBy: userId } })

      // Reassign IVS import batches (NoAction FK) to another admin when possible
      const replacementAdmin = await tx.users.findFirst({
        where: {
          role: 'ADMIN',
          isActive: true,
          id: { not: userId }
        },
        select: { id: true }
      })
      if (replacementAdmin) {
        await tx.ivs_import_batches.updateMany({
          where: { importedBy: userId },
          data: { importedBy: replacementAdmin.id }
        })
      } else {
        // No other admin — delete batches they own (rare for self-delete)
        await tx.ivs_import_batches.deleteMany({ where: { importedBy: userId } })
      }

      // Optional createdBy refs
      await tx.locations.updateMany({
        where: { createdBy: userId },
        data: { createdBy: null }
      })
      await tx.shift_templates.updateMany({
        where: { createdBy: userId },
        data: { createdBy: null }
      })

      await tx.users.delete({ where: { id: userId } })
    }

    return {
      deletedUserId: userId,
      deletedVolunteerId: volunteerId,
      removedAssignments
    }
  })
}
