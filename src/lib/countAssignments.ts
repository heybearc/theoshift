import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../pages/api/auth/[...nextauth]'
import { prisma } from './prisma'
import { canManageAttendants } from './eventAccess'
import { getViewAsVolunteerId, isPrivilegedCounterRole, isSimulatedMode } from './countAssignmentsShared'
export { getViewAsVolunteerId, isPrivilegedCounterRole, isSimulatedMode } from './countAssignmentsShared'

export function blockSimulatedMutation(req: NextApiRequest, res: NextApiResponse): boolean {
  if (!isSimulatedMode(req)) return false
  res.status(403).json({
    error: 'Mutations are blocked while view-as-volunteer simulation is active.'
  })
  return true
}

export async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return null
  return {
    id: session.user.id,
    role: session.user.role || '',
    email: session.user.email || ''
  }
}

export async function resolveVolunteerIdForSessionUser(userId: string, role: string): Promise<string | null> {
  if (role === 'VOLUNTEER' || role === 'ATTENDANT') {
    return userId
  }

  const volunteer = await prisma.volunteers.findFirst({
    where: { userId },
    select: { id: true }
  })
  return volunteer?.id || null
}

/**
 * `count_group_entries.enteredBy` references users.id. Volunteer sessions use volunteers.id as
 * session.user.id — passing that into enteredBy violates FK and causes 500 on group count submit.
 * Returns the linked account user id for volunteers, or null if they have no users row.
 */
export async function resolveUserIdForCountEnteredBy(sessionUserId: string, role: string): Promise<string | null> {
  if (role !== 'VOLUNTEER' && role !== 'ATTENDANT') {
    return sessionUserId
  }
  const volunteer = await prisma.volunteers.findUnique({
    where: { id: sessionUserId },
    select: { userId: true }
  })
  return volunteer?.userId ?? null
}

export async function isVolunteerAssignedToSessionPosition(
  countSessionId: string,
  positionId: string,
  volunteerId: string
): Promise<boolean> {
  const assignment = await prisma.count_session_position_assignees.findFirst({
    where: {
      countSessionId,
      positionId,
      volunteerId,
      isSuggested: false
    },
    select: { id: true }
  })
  return !!assignment
}

const COUNT_REVISION_ROLES = ['ADMIN', 'OVERSEER', 'ASSISTANT_OVERSEER', 'KEYMAN', 'SUPPORT'] as const

/** Overseers and event staff may change a count after it has been submitted. */
export async function canReviseSubmittedCount(
  userId: string,
  role: string,
  eventId: string
): Promise<boolean> {
  if ((COUNT_REVISION_ROLES as readonly string[]).includes(role)) return true
  if (await canManageAttendants(userId, eventId)) return true

  const volunteerId = await resolveVolunteerIdForSessionUser(userId, role)
  if (!volunteerId) return false

  const membership = await prisma.event_volunteers.findFirst({
    where: {
      eventId,
      volunteerId,
      OR: [
        { isOverseer: true },
        { isKeyman: true },
        { role: { in: [...COUNT_REVISION_ROLES] } },
      ],
    },
    select: { id: true },
  })
  return Boolean(membership)
}

export async function hasSessionPositionAssignees(countSessionId: string, positionId: string): Promise<boolean> {
  const found = await prisma.count_session_position_assignees.findFirst({
    where: {
      countSessionId,
      positionId
    },
    select: { id: true }
  })
  return !!found
}
