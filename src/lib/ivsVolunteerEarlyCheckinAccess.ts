import { NextApiRequest } from 'next'
import { prisma } from '@/lib/prisma'
import {
  getViewAsVolunteerId,
  isPrivilegedCounterRole,
} from '@/lib/countAssignmentsShared'
import { resolveVolunteerIdForSessionUser } from '@/lib/countAssignments'
import { canViewIvsVolunteers } from '@/lib/eventAccess'

function canUseViewAs(role: string | undefined): boolean {
  if (!role) return false
  const normalized = role.trim().toUpperCase()
  return (
    isPrivilegedCounterRole(normalized) ||
    normalized === 'ASSISTANT_OVERSEER'
  )
}

export type EarlyCheckinAccessResult =
  | { ok: true; volunteerId: string }
  | { ok: false; status: number; message: string }

/**
 * Resolve the volunteers.id used for IVS early check-in access.
 * Volunteer sessions use volunteers.id as session.user.id; staff may simulate via x-view-as-volunteer-id.
 */
export async function resolveEarlyCheckinVolunteerId(
  req: NextApiRequest,
  sessionUserId: string,
  sessionRole: string | undefined,
): Promise<string | null> {
  const viewAs = getViewAsVolunteerId(req)
  if (viewAs && canUseViewAs(sessionRole)) {
    const exists = await prisma.volunteers.findUnique({
      where: { id: viewAs },
      select: { id: true },
    })
    return exists?.id ?? null
  }

  const bySession = await resolveVolunteerIdForSessionUser(sessionUserId, sessionRole || '')
  if (bySession) return bySession

  // Staff linked by users.id → volunteers.userId already covered above; also accept direct volunteers.id
  const byId = await prisma.volunteers.findUnique({
    where: { id: sessionUserId },
    select: { id: true },
  })
  return byId?.id ?? null
}

/**
 * Early check-in is available when IVS is on for the event and the person is on that
 * event roster (active event_volunteers). Staff with IVS view rights may also open it.
 */
export async function verifyVolunteerIvsEarlyCheckinAccessForIds(
  sessionUserId: string,
  sessionRole: string | undefined,
  eventId: string,
  options?: { viewAsVolunteerId?: string | null },
): Promise<EarlyCheckinAccessResult> {
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { eventType: true, settings: true },
  })

  const ivsModuleEnabled = !!(event?.settings as any)?.modules?.ivsModule
  if (!ivsModuleEnabled) {
    return { ok: false, status: 403, message: 'IVS module is not enabled for this event' }
  }

  let volunteerId: string | null = null
  const viewAs = options?.viewAsVolunteerId?.trim() || null
  if (viewAs && canUseViewAs(sessionRole)) {
    const exists = await prisma.volunteers.findUnique({
      where: { id: viewAs },
      select: { id: true },
    })
    volunteerId = exists?.id ?? null
  } else {
    volunteerId = await resolveVolunteerIdForSessionUser(sessionUserId, sessionRole || '')
    if (!volunteerId) {
      const byId = await prisma.volunteers.findUnique({
        where: { id: sessionUserId },
        select: { id: true },
      })
      volunteerId = byId?.id ?? null
    }
  }

  if (volunteerId) {
    const onEvent = await prisma.event_volunteers.findFirst({
      where: {
        eventId,
        volunteerId,
        isActive: true,
      },
      select: { id: true },
    })
    if (onEvent) {
      return { ok: true, volunteerId }
    }
  }

  if (await canViewIvsVolunteers(sessionUserId, eventId)) {
    return { ok: true, volunteerId: volunteerId || sessionUserId }
  }

  return {
    ok: false,
    status: 403,
    message: 'Access denied - Early check-in is only available for people on this event roster',
  }
}

export async function verifyVolunteerIvsEarlyCheckinAccess(
  req: NextApiRequest,
  sessionUserId: string,
  sessionRole: string | undefined,
  eventId: string,
): Promise<EarlyCheckinAccessResult> {
  return verifyVolunteerIvsEarlyCheckinAccessForIds(sessionUserId, sessionRole, eventId, {
    viewAsVolunteerId: getViewAsVolunteerId(req),
  })
}

/**
 * IVS volunteer intake: anyone active on the roster of an IVS-enabled event,
 * matching Early Check-In eligibility. A resolvable volunteers.id is required
 * because submissions are attributed to the submitter. Staff View As supported.
 */
export async function verifyVolunteerOnIvsRosterForIds(
  sessionUserId: string,
  sessionRole: string | undefined,
  eventId: string,
  options?: { viewAsVolunteerId?: string | null },
): Promise<EarlyCheckinAccessResult> {
  const event = await prisma.events.findUnique({
    where: { id: eventId },
    select: { settings: true },
  })

  const ivsModuleEnabled = !!(event?.settings as any)?.modules?.ivsModule
  if (!ivsModuleEnabled) {
    return { ok: false, status: 403, message: 'IVS module is not enabled for this event' }
  }

  let volunteerId: string | null = null
  const viewAs = options?.viewAsVolunteerId?.trim() || null
  if (viewAs && canUseViewAs(sessionRole)) {
    const exists = await prisma.volunteers.findUnique({
      where: { id: viewAs },
      select: { id: true },
    })
    volunteerId = exists?.id ?? null
  } else {
    volunteerId = await resolveVolunteerIdForSessionUser(sessionUserId, sessionRole || '')
    if (!volunteerId) {
      const byId = await prisma.volunteers.findUnique({
        where: { id: sessionUserId },
        select: { id: true },
      })
      volunteerId = byId?.id ?? null
    }
  }

  if (!volunteerId) {
    return {
      ok: false,
      status: 403,
      message: 'Access denied — only people on this event roster can submit requests',
    }
  }

  const onEvent = await prisma.event_volunteers.findFirst({
    where: {
      eventId,
      volunteerId,
      isActive: true,
    },
    select: { id: true },
  })

  if (!onEvent) {
    return {
      ok: false,
      status: 403,
      message: 'Access denied — only people on this event roster can submit requests',
    }
  }

  return { ok: true, volunteerId }
}

export async function verifyVolunteerOnIvsRoster(
  req: NextApiRequest,
  sessionUserId: string,
  sessionRole: string | undefined,
  eventId: string,
): Promise<EarlyCheckinAccessResult> {
  return verifyVolunteerOnIvsRosterForIds(sessionUserId, sessionRole, eventId, {
    viewAsVolunteerId: getViewAsVolunteerId(req),
  })
}

/** Marker embedded in ivsApprovalNotes so submitters can list their own requests. */
export function ivsRequestByMarker(volunteerId: string): string {
  return `[requestedBy:${volunteerId}]`
}
